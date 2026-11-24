#!/usr/bin/env node
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { inspect, promisify } from "node:util";

const DEFAULT_MANUAL_URL = "https://developers.openai.com/codex/codex-manual.md";
const DEFAULT_CACHE_DIR_NAME = "openai-docs-cache";
const CACHE_FILE_NAME = "codex-manual.md";
const OUTLINE_FILE_NAME = "codex-manual.outline.md";
const HASH_HEADER = "x-content-sha256";
const USER_AGENT = "codex-openai-docs";
const execFileAsync = promisify(execFile);

class ManualFetchError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ManualFetchError";
  }
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const withTimeout = async (promiseFactory, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const proxyConfigured = () =>
  process.env.HTTP_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.http_proxy ||
  process.env.https_proxy;

const responseHeaders = (headers) => ({
  get(name) {
    return headers.get(name.toLowerCase()) ?? null;
  },
});

const makeResponse = ({ body, headers, status }) => ({
  headers: responseHeaders(headers),
  ok: status >= 200 && status < 300,
  status,
  async text() {
    return body;
  },
});

const parseCurlHeaders = (rawHeaders) => {
  const normalized = rawHeaders.replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n\n+/).filter(Boolean);
  const headerBlock = [...blocks]
    .reverse()
    .find((block) => block.startsWith("HTTP/"));

  if (!headerBlock) {
    throw new ManualFetchError("curl did not return HTTP response headers.");
  }

  const [statusLine, ...lines] = headerBlock.split("\n");
  const statusMatch = /^HTTP\/\S+\s+(\d{3})/.exec(statusLine);
  if (!statusMatch) {
    throw new ManualFetchError(
      `Could not parse HTTP status from curl response: ${statusLine}`
    );
  }

  const headers = new Map();
  lines.forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    headers.set(name, value);
  });

  return {
    headers,
    status: Number(statusMatch[1]),
  };
};

const tempFilePath = (cacheDir, suffix) =>
  path.join(
    cacheDir,
    `.fetch-codex-manual-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}${suffix}`
  );

const requestManualWithCurl = async (url, { cacheDir, method, timeoutMs }) => {
  const headerPath = tempFilePath(cacheDir, ".headers");
  const bodyPath = tempFilePath(cacheDir, ".body");
  const curlNames =
    process.platform === "win32" ? ["curl.exe", "curl"] : ["curl"];
  const args = [
    "--silent",
    "--show-error",
    "--location",
    "--dump-header",
    headerPath,
    "--output",
    bodyPath,
    "--user-agent",
    USER_AGENT,
    "--max-time",
    String(Math.max(1, Math.ceil(timeoutMs / 1000))),
  ];

  if (method === "HEAD") {
    args.push("--head");
  } else {
    args.push("--request", method);
  }
  args.push(url);

  let lastError;
  for (const curlName of curlNames) {
    try {
      await execFileAsync(curlName, args, { windowsHide: true });
      const [rawHeaders, body] = await Promise.all([
        readFile(headerPath, "utf8"),
        readFile(bodyPath, "utf8"),
      ]);
      const { headers, status } = parseCurlHeaders(rawHeaders);
      return makeResponse({ body, headers, status });
    } catch (error) {
      lastError = error;
      if (error?.code !== "ENOENT") break;
    } finally {
      await Promise.all([
        rm(headerPath, { force: true }),
        rm(bodyPath, { force: true }),
      ]);
    }
  }

  if (lastError?.code === "ENOENT") {
    throw new ManualFetchError("curl is unavailable in this environment.", {
      cause: lastError,
    });
  }
  throw new ManualFetchError(`${method} ${url} could not be fetched.`, {
    cause: lastError,
  });
};

const requestManualWithFetch = async (url, { method, timeoutMs }) => {
  if (typeof fetch !== "function") {
    throw new ManualFetchError(
      "Native fetch is unavailable in this Node runtime."
    );
  }

  return withTimeout(
    (signal) =>
      fetch(url, {
        method,
        headers: { "User-Agent": USER_AGENT },
        signal,
      }),
    timeoutMs
  );
};

const requestManual = async (url, { cacheDir, method, timeoutMs }) => {
  const preferCurl = Boolean(proxyConfigured()) || typeof fetch !== "function";
  const transports = preferCurl
    ? [
        () => requestManualWithCurl(url, { cacheDir, method, timeoutMs }),
        () => requestManualWithFetch(url, { method, timeoutMs }),
      ]
    : [
        () => requestManualWithFetch(url, { method, timeoutMs }),
        () => requestManualWithCurl(url, { cacheDir, method, timeoutMs }),
      ];

  let lastError;
  for (const transport of transports) {
    try {
      const response = await transport();
      if (!response.ok) {
        throw new ManualFetchError(
          `${method} ${url} failed with HTTP ${response.status}.`
        );
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw new ManualFetchError(`${method} ${url} could not be fetched.`, {
    cause: lastError,
  });
};

const readHeaderSha = (response) => {
  const value = response.headers.get(HASH_HEADER);
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new ManualFetchError(`Manual response is missing ${HASH_HEADER}.`);
  }
  return value.toLowerCase();
};

const nearestExistingParent = async (target) => {
  let current = target;
  while (true) {
    try {
      const info = await stat(current);
      return info.isDirectory() ? current : null;
    } catch (error) {
      if (error?.code !== "ENOENT") return null;
    }

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
};

const usableCacheDir = async (cacheDir) => {
  if (!cacheDir) return null;
  const resolved = path.resolve(cacheDir);

  try {
    const info = await stat(resolved);
    if (!info.isDirectory()) return null;
  } catch (error) {
    if (error?.code !== "ENOENT") return null;
  }

  const parent = await nearestExistingParent(resolved);
  if (!parent) return null;

  try {
    await access(parent, fsConstants.W_OK | fsConstants.X_OK);
  } catch {
    return null;
  }

  return resolved;
};

const defaultCacheDirCandidates = () => {
  const candidates = [];
  const seen = new Set();
  const pushCandidate = (candidate) => {
    if (!candidate || seen.has(candidate)) return;
    seen.add(candidate);
    candidates.push(candidate);
  };

  [process.env.TMPDIR, process.env.TEMP, process.env.TMP].forEach((baseDir) => {
    if (baseDir) {
      pushCandidate(path.join(baseDir, DEFAULT_CACHE_DIR_NAME));
    }
  });

  if (process.platform !== "win32") {
    pushCandidate(`/private/tmp/${DEFAULT_CACHE_DIR_NAME}`);
    pushCandidate(`/tmp/${DEFAULT_CACHE_DIR_NAME}`);
  }

  return candidates;
};

const resolveCacheDir = async (cacheDir) => {
  if (cacheDir) {
    return usableCacheDir(cacheDir);
  }

  for (const candidate of defaultCacheDirCandidates()) {
    const usable = await usableCacheDir(candidate);
    if (usable) return usable;
  }

  return null;
};

const cacheFilePath = (cacheDir) => path.join(cacheDir, CACHE_FILE_NAME);

const outlineFilePath = (cacheDir) => path.join(cacheDir, OUTLINE_FILE_NAME);

const manualLines = (manual) => {
  const lines = manual.replace(/\r\n/g, "\n").split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
};

const sectionTitle = (rawTitle) =>
  rawTitle.replace(/\s+#+\s*$/, "").replace(/\s+/g, " ").trim();

const buildOutline = (manual) => {
  const lines = manualLines(manual);
  const headings = [];
  let inFence = false;

  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) return;

    const level = match[1].length;
    if (level < 2 || level > 3) return;

    headings.push({
      level,
      title: sectionTitle(match[2]),
      startLine: index + 1,
      endLine: lines.length,
    });
  });

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const nextPeer = headings
      .slice(index + 1)
      .find((candidate) => candidate.level <= heading.level);
    if (nextPeer) {
      heading.endLine = nextPeer.startLine - 1;
    }
  }

  if (headings.length === 0) {
    return {
      headingCount: 0,
      lineCount: lines.length,
      text: "No markdown headings found.",
    };
  }

  const minLevel = Math.min(...headings.map((heading) => heading.level));
  return {
    headingCount: headings.length,
    lineCount: lines.length,
    text: headings
      .map((heading) => {
        const indent = "  ".repeat(heading.level - minLevel);
        return `${indent}- ${heading.title} (lines ${heading.startLine}-${heading.endLine})`;
      })
      .join("\n"),
  };
};

const outlineMarkdown = (outline) => `# Codex Manual Outline\n\n${outline.text}\n`;

const manualStatusLine = (status) =>
  status.cacheStatus === "hit"
    ? "Manual status: local manual was already current."
    : "Manual status: local manual was updated.";

const formatResult = ({ status, outlineText }) =>
  [
    `Manual path: ${status.manualPath}`,
    `Outline path: ${status.outlinePath}`,
    manualStatusLine(status),
    "",
    outlineText,
  ].join("\n");

const readCachedManual = async (cacheDir, expectedSha256) => {
  try {
    const manual = await readFile(cacheFilePath(cacheDir), "utf8");
    return sha256(manual) === expectedSha256 ? manual : null;
  } catch {
    return null;
  }
};

const writeCachedManual = async (cacheDir, manual) => {
  await mkdir(cacheDir, { recursive: true });
  const tmpPath = tempFilePath(cacheDir, `.${CACHE_FILE_NAME}.tmp`);
  await writeFile(tmpPath, manual, "utf8");
  await rename(tmpPath, cacheFilePath(cacheDir));
};

const writeOutline = async (cacheDir, outlineText) => {
  await mkdir(cacheDir, { recursive: true });
  const tmpPath = tempFilePath(cacheDir, `.${OUTLINE_FILE_NAME}.tmp`);
  await writeFile(tmpPath, outlineText, "utf8");
  await rename(tmpPath, outlineFilePath(cacheDir));
};

const fetchCodexManual = async ({
  manualUrl = DEFAULT_MANUAL_URL,
  cacheDir,
  timeoutMs = 30000,
} = {}) => {
  const resolvedCacheDir = await resolveCacheDir(cacheDir);
  if (!resolvedCacheDir) {
    throw new ManualFetchError(
      "Manual cache directory is unavailable; pass --cache-dir to override or use OpenAI Docs MCP fallback."
    );
  }
  await mkdir(resolvedCacheDir, { recursive: true });

  const headResponse = await requestManual(manualUrl, {
    cacheDir: resolvedCacheDir,
    method: "HEAD",
    timeoutMs,
  });
  const expectedSha256 = readHeaderSha(headResponse);
  const manualPath = cacheFilePath(resolvedCacheDir);
  const outlinePath = outlineFilePath(resolvedCacheDir);
  const checkedAt = new Date().toISOString();

  const cachedManual = await readCachedManual(resolvedCacheDir, expectedSha256);
  if (cachedManual !== null) {
    const outline = buildOutline(cachedManual);
    const outlineText = outlineMarkdown(outline);
    await writeOutline(resolvedCacheDir, outlineText);

    return {
      outlineText,
      status: {
        manualUrl,
        headerSha256: expectedSha256,
        fetchedManualSha256: expectedSha256,
        manualHashMatches: true,
        cacheStatus: "hit",
        cacheDir: resolvedCacheDir,
        manualPath,
        outlinePath,
        checkedAt,
        lineCount: outline.lineCount,
        headingCount: outline.headingCount,
      },
    };
  }

  const getResponse = await requestManual(manualUrl, {
    cacheDir: resolvedCacheDir,
    method: "GET",
    timeoutMs,
  });
  const getHeaderSha256 = readHeaderSha(getResponse);
  if (getHeaderSha256 !== expectedSha256) {
    throw new ManualFetchError(
      `${HASH_HEADER} changed between HEAD and GET for ${manualUrl}.`
    );
  }

  const manualText = await getResponse.text();
  const actualSha256 = sha256(manualText);
  const manualHashMatches = actualSha256 === expectedSha256;
  if (!manualHashMatches) {
    throw new ManualFetchError(
      `${HASH_HEADER} did not match the fetched manual body for ${manualUrl}.`
    );
  }

  await writeCachedManual(resolvedCacheDir, manualText);
  const outline = buildOutline(manualText);
  const outlineText = outlineMarkdown(outline);
  await writeOutline(resolvedCacheDir, outlineText);

  return {
    outlineText,
    status: {
      manualUrl,
      headerSha256: expectedSha256,
      fetchedManualSha256: actualSha256,
      manualHashMatches,
      cacheStatus: "updated",
      cacheDir: resolvedCacheDir,
      manualPath,
      outlinePath,
      checkedAt,
      lineCount: outline.lineCount,
      headingCount: outline.headingCount,
    },
  };
};

const parseArgs = (argv) => {
  const args = {
    manualUrl: DEFAULT_MANUAL_URL,
    cacheDir: undefined,
    timeoutMs: 30000,
    statusJson: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manual-url") {
      args.manualUrl = argv[++index];
    } else if (arg === "--cache-dir") {
      args.cacheDir = argv[++index];
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = Number(argv[++index]);
    } else if (arg === "--status-json") {
      args.statusJson = true;
    } else {
      throw new ManualFetchError(`Unknown argument: ${arg}`);
    }
  }

  if (!args.manualUrl) {
    throw new ManualFetchError("--manual-url cannot be empty.");
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new ManualFetchError("--timeout-ms must be a positive number.");
  }

  return args;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const { outlineText, status } = await fetchCodexManual(args);

  process.stdout.write(formatResult({ status, outlineText }));

  if (args.statusJson) {
    console.error(JSON.stringify(status));
  }
};

const envProxyHint = () => {
  if (proxyConfigured()) {
    return "Hint: proxy env vars are present. This helper prefers `curl` in proxied sessions; if requests still fail, verify `curl` is installed and the proxy configuration is valid.";
  }
  if (typeof fetch !== "function") {
    return "Hint: native fetch is unavailable in this Node runtime. Install `curl` or use a newer Node version to fetch the manual.";
  }
  if (process.platform === "win32") {
    return "Hint: on Windows, pass a cache dir under `%TEMP%` or `%TMP%`.";
  }
  return null;
};

const formatErrorDetails = (error) => {
  const details = inspect(error, {
    breakLength: 120,
    colors: false,
    compact: false,
    depth: 8,
  });
  if (!error?.cause) {
    return details;
  }

  return `${details}\n\nCause:\n${inspect(error.cause, {
    breakLength: 120,
    colors: false,
    compact: false,
    depth: 8,
  })}`;
};

const isCliEntrypoint = () => {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }

  return pathToFileURL(entrypoint).href === import.meta.url;
};

if (isCliEntrypoint()) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    const hint = envProxyHint();
    if (hint) {
      console.error(hint);
    }
    console.error("");
    console.error("Details:");
    console.error(formatErrorDetails(error));
    process.exitCode = 1;
  });
}

export { DEFAULT_MANUAL_URL, fetchCodexManual };
