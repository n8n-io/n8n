#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const secretPatterns = [
  { category: "private_key", regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i },
  { category: "aws_access_key_id", regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { category: "github_token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { category: "slack_token", regex: /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/ },
  { category: "anthropic_api_key", regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { category: "openai_api_key", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { category: "stripe_secret_key", regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { category: "linear_api_key", regex: /\blin_api_[A-Za-z0-9]{20,}\b/ },
  { category: "credentialed_url", regex: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@[^/\s]+/i },
];

const sensitiveNamePattern =
  /(?:SECRET|TOKEN|PASSWORD|PASSCODE|PASSPHRASE|API[_-]?KEY|ACCESS[_-]?KEY|PRIVATE[_-]?KEY|CLIENT[_-]?SECRET|WEBHOOK[_-]?SECRET|AUTH[_-]?SECRET|DATABASE[_-]?URL)/i;

const safePlaceholderPattern =
  /^(?:["']?)?(?:<[^>]+>|\[[^\]]+\]|\$\{?[A-Z0-9_]+\}?|your[_-]?[a-z0-9_-]*(?:key|token|secret|password)|redacted|masked|placeholder|example|changeme|replace[_-]?me|xxx+|\*{3,}|\.{3,})(?:["']?)?$/i;

function readStdin() {
  return new Promise((resolve) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
  });
}

function extractStringValues(value, values = []) {
  if (typeof value === "string") {
    values.push(value);
    return values;
  }

  if (Array.isArray(value)) {
    for (const item of value) extractStringValues(item, values);
    return values;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) extractStringValues(item, values);
  }

  return values;
}

function normalizeAssignmentValue(value) {
  return value
    .replace(/\s+#.*$/, "")
    .trim()
    .replace(/,$/, "")
    .replace(/^['"`]/, "")
    .replace(/['"`]$/, "");
}

function isSafePlaceholder(value) {
  const normalized = normalizeAssignmentValue(value);
  return !normalized || safePlaceholderPattern.test(normalized);
}

function hasHighEntropyShape(value) {
  const normalized = normalizeAssignmentValue(value);

  if (normalized.length < 16 || /\s/.test(normalized)) return false;

  const uniqueCharacters = new Set(normalized).size;
  const hasMixedCharacterClasses =
    /[a-z]/.test(normalized) &&
    /[A-Z]/.test(normalized) &&
    /(?:\d|[_+/=-])/.test(normalized);

  return uniqueCharacters >= 10 && hasMixedCharacterClasses;
}

function isLikelySecretValue(value) {
  const normalized = normalizeAssignmentValue(value);

  if (isSafePlaceholder(normalized)) return false;
  if (secretPatterns.some(({ regex }) => regex.test(normalized))) return true;
  if (normalized.length >= 24 && !/\s/.test(normalized)) return true;

  return hasHighEntropyShape(normalized);
}

function detectSecret(text) {
  for (const { category, regex } of secretPatterns) {
    if (regex.test(text)) return category;
  }

  const assignmentPattern = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_-]*)\s*[:=]\s*(.+?)\s*$/gim;

  for (const match of text.matchAll(assignmentPattern)) {
    const [, name, rawValue] = match;
    if (sensitiveNamePattern.test(name) && isLikelySecretValue(rawValue)) {
      return "secret_assignment";
    }
  }

  return null;
}

function writeSecurityLog(category, payload) {
  const logPath =
    process.env.CURSOR_SECURITY_LOG || path.join(os.tmpdir(), "cursor-security.log");
  const userEmail = payload.user_email || payload.userEmail || "unknown";
  const eventName = payload.hook_event_name || payload.event || "beforeSubmitPrompt";
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] SECURITY: ${category} detected during ${eventName} from user: ${userEmail}\n`;

  try {
    fs.appendFileSync(logPath, line, { encoding: "utf8", mode: 0o600 });
  } catch {
    // Logging must not expose or block a prompt by itself.
  }
}

function allowPrompt() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

function blockPrompt() {
  process.stdout.write(
    JSON.stringify({
      continue: false,
      user_message:
        "Prompt blocked because it appears to contain a raw secret or API key. Remove the value, use a redacted placeholder, or store it in your local environment instead.",
    }),
  );
}

async function main() {
  const input = await readStdin();
  let payload = {};
  let texts = [input];

  try {
    payload = input.trim() ? JSON.parse(input) : {};
    texts = extractStringValues(payload);
  } catch {
    // If Cursor changes the payload shape, still scan the raw input text.
  }

  for (const text of texts) {
    const category = detectSecret(text);

    if (category) {
      writeSecurityLog(category, payload);
      blockPrompt();
      return;
    }
  }

  allowPrompt();
}

main().catch(() => {
  process.stdout.write(
    JSON.stringify({
      continue: false,
      user_message:
        "Prompt blocked because the secret-scanning hook failed. Please retry after checking the project hook configuration.",
    }),
  );
});
