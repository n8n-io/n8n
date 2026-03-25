#!/usr/bin/env node

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const stream = require('stream');
const process = require('process');

const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const ProgressBar = require('progress');
const Proxy = require('proxy-from-env');
const which = require('which');

const helper = require('../js/helper');
const pkgInfo = require('../package.json');
const Logger = require('../js/logger');

const logger = new Logger(getLogStream('stderr'));

const CDN_URL =
  process.env.SENTRYCLI_LOCAL_CDNURL ||
  process.env.npm_config_sentrycli_cdnurl ||
  process.env.SENTRYCLI_CDNURL ||
  'https://downloads.sentry-cdn.com/sentry-cli';

function getLogStream(defaultStream) {
  const logStream = process.env.SENTRYCLI_LOG_STREAM || defaultStream;

  if (logStream === 'stdout') {
    return process.stdout;
  }

  if (logStream === 'stderr') {
    return process.stderr;
  }

  throw new Error(
    `Incorrect SENTRYCLI_LOG_STREAM env variable. Possible values: 'stdout' | 'stderr'`
  );
}

function shouldRenderProgressBar() {
  const silentFlag = process.argv.some((v) => v === '--silent');
  const silentConfig = process.env.npm_config_loglevel === 'silent';
  const silentEnv = process.env.SENTRYCLI_NO_PROGRESS_BAR;
  const ciEnv = process.env.CI === 'true' || process.env.CI === '1';
  const notTTY = !process.stdout.isTTY;
  // If any of possible options is set, skip rendering of progress bar
  return !(silentFlag || silentConfig || silentEnv || ciEnv || notTTY);
}

function getDownloadUrl(platform, arch) {
  const releasesUrl = `${CDN_URL}/${pkgInfo.version}/sentry-cli`;
  let archString = '';
  switch (arch) {
    case 'x64':
      archString = 'x86_64';
      break;
    case 'x86':
    case 'ia32':
      archString = 'i686';
      break;
    case 'arm64':
      archString = 'aarch64';
      break;
    case 'arm':
      archString = 'armv7';
      break;
    default:
      archString = arch;
  }
  switch (platform) {
    case 'darwin':
      return `${releasesUrl}-Darwin-universal`;
    case 'win32':
      return `${releasesUrl}-Windows-${archString}.exe`;
    case 'linux':
    case 'freebsd':
    case 'android':
      return `${releasesUrl}-Linux-${archString}`;
    default:
      return null;
  }
}

function createProgressBar(name, total) {
  const incorrectTotal = typeof total !== 'number' || Number.isNaN(total);

  if (incorrectTotal || !shouldRenderProgressBar()) {
    return {
      tick: () => {},
    };
  }

  const logStream = getLogStream('stdout');

  if (logStream.isTTY) {
    return new ProgressBar(`fetching ${name} :bar :percent :etas`, {
      complete: '█',
      incomplete: '░',
      width: 20,
      total,
    });
  }

  let pct = null;
  let current = 0;
  return {
    tick: (length) => {
      current += length;
      const next = Math.round((current / total) * 100);
      if (next > pct) {
        pct = next;
        logStream.write(`fetching ${name} ${pct}%\n`);
      }
    },
  };
}

function npmCache() {
  const keys = ['npm_config_cache', 'npm_config_cache_folder', 'npm_config_yarn_offline_mirror'];

  for (let key of [...keys, ...keys.map((k) => k.toUpperCase())]) {
    if (process.env[key]) return process.env[key];
  }

  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'npm-cache');
  }

  return path.join(os.homedir(), '.npm');
}

function getCachedPath(url) {
  const digest = crypto.createHash('md5').update(url).digest('hex').slice(0, 6);

  return path.join(
    npmCache(),
    'sentry-cli',
    `${digest}-${path.basename(url).replace(/[^a-zA-Z0-9.]+/g, '-')}`
  );
}

function getTempFile(cached) {
  return `${cached}.${process.pid}-${Math.random().toString(16).slice(2)}.tmp`;
}

function validateChecksum(tempPath, name) {
  let storedHash;
  try {
    const checksums = fs.readFileSync(path.join(__dirname, '../checksums.txt'), 'utf8');
    const entries = checksums.split('\n');
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i].split('=');
      if (key === name) {
        storedHash = value;
        break;
      }
    }
  } catch (e) {
    logger.log(
      'Checksums are generated when the package is published to npm. They are not available directly in the source repository. Skipping validation.'
    );
    return;
  }

  if (!storedHash) {
    logger.log(`Checksum for ${name} not found, skipping validation.`);
    return;
  }

  const currentHash = crypto.createHash('sha256').update(fs.readFileSync(tempPath)).digest('hex');

  if (storedHash !== currentHash) {
    fs.unlinkSync(tempPath);
    throw new Error(
      `Checksum validation for ${name} failed.\nExpected: ${storedHash}\nReceived: ${currentHash}`
    );
  } else {
    logger.log('Checksum validation passed.');
  }
}

async function downloadBinary() {
  const arch = os.arch();
  const platform = os.platform();
  const outputPath = helper.getFallbackBinaryPath();

  if (process.env.SENTRYCLI_USE_LOCAL === '1') {
    try {
      const binPaths = which.sync('sentry-cli', { all: true });
      if (!binPaths.length) throw new Error('Binary not found');
      const binPath = binPaths[binPaths.length - 1];
      logger.log(`Using local binary: ${binPath}`);
      fs.copyFileSync(binPath, outputPath);
      return Promise.resolve();
    } catch (e) {
      throw new Error(
        'Configured installation of local binary, but it was not found.' +
          'Make sure that `sentry-cli` executable is available in your $PATH or disable SENTRYCLI_USE_LOCAL env variable.'
      );
    }
  }

  const downloadUrl = getDownloadUrl(platform, arch);
  if (!downloadUrl) {
    throw new Error(`Unsupported target ${platform}-${arch}`);
  }

  const cachedPath = getCachedPath(downloadUrl);
  if (fs.existsSync(cachedPath)) {
    logger.log(`Using cached binary: ${cachedPath}`);
    fs.copyFileSync(cachedPath, outputPath);
    return;
  }

  const proxyUrl = Proxy.getProxyForUrl(downloadUrl);
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

  logger.log(`Downloading from ${downloadUrl}`);

  if (proxyUrl) {
    logger.log(`Using proxy URL: ${proxyUrl}`);
  }

  let response;
  try {
    response = await fetch(downloadUrl, {
      agent,
      compress: false,
      headers: {
        'accept-encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
    });
  } catch (error) {
    let errorMsg = `Unable to download sentry-cli binary from ${downloadUrl}.\nError message: ${error.message}`;
    if (error.code) {
      errorMsg += `\nError code: ${error.code}`;
    }
    throw new Error(errorMsg);
  }

  if (!response.ok) {
    let errorMsg = `Unable to download sentry-cli binary from ${downloadUrl}.\nServer returned: ${response.status}`;
    if (response.statusText) {
      errorMsg += ` - ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  const contentEncoding = response.headers.get('content-encoding');
  let decompressor;
  if (/\bgzip\b/.test(contentEncoding)) {
    decompressor = zlib.createGunzip();
  } else if (/\bdeflate\b/.test(contentEncoding)) {
    decompressor = zlib.createInflate();
  } else if (/\bbr\b/.test(contentEncoding)) {
    decompressor = zlib.createBrotliDecompress();
  } else {
    decompressor = new stream.PassThrough();
  }
  const name = downloadUrl.match(/.*\/(.*?)$/)[1];
  let downloadedBytes = 0;
  const totalBytes = parseInt(response.headers.get('content-length'), 10);
  const progressBar = createProgressBar(name, totalBytes);
  const tempPath = getTempFile(cachedPath);
  fs.mkdirSync(path.dirname(tempPath), { recursive: true });

  await new Promise((resolve, reject) => {
    response.body
      .on('error', (e) => reject(e))
      .on('data', (chunk) => {
        downloadedBytes += chunk.length;
        progressBar.tick(chunk.length);
      })
      .pipe(decompressor)
      .pipe(fs.createWriteStream(tempPath, { mode: '0755' }))
      .on('error', (e) => reject(e))
      .on('close', () => {
        if (downloadedBytes >= totalBytes) {
          resolve();
        } else {
          reject(new Error('connection interrupted'));
        }
      });
  });

  if (process.env.SENTRYCLI_SKIP_CHECKSUM_VALIDATION !== '1') {
    validateChecksum(tempPath, name);
  }

  fs.copyFileSync(tempPath, cachedPath);
  fs.copyFileSync(tempPath, outputPath);
  fs.unlinkSync(tempPath);
}

async function checkVersion() {
  const output = await helper.execute(['--version']);
  const version = output.replace('sentry-cli ', '').trim();
  const expected = pkgInfo.version;
  if (version !== expected) {
    throw new Error(`Unexpected sentry-cli version "${version}", expected "${expected}"`);
  }
}

if (process.env.SENTRYCLI_SKIP_DOWNLOAD === '1') {
  logger.log(`Skipping download because SENTRYCLI_SKIP_DOWNLOAD=1 detected.`);
  process.exit(0);
}

const { packageName: distributionPackageName, subpath: distributionSubpath } =
  helper.getDistributionForThisPlatform();

if (distributionPackageName === undefined) {
  helper.throwUnsupportedPlatformError();
}

try {
  require.resolve(`${distributionPackageName}/${distributionSubpath}`);
  // If the `resolve` call succeeds it means a binary was installed successfully via optional dependencies so we can skip the manual postinstall download.
  process.exit(0);
} catch (e) {
  // Optional dependencies likely didn't get installed - proceed with fallback downloading manually
  // Log message inspired by esbuild: https://github.com/evanw/esbuild/blob/914f6080c77cfe32a54888caa51ca6ea13873ce9/lib/npm/node-install.ts#L253
  logger.log(
    `Sentry CLI failed to locate the "${distributionPackageName}" package after installation!

This can happen if you use an option to disable optional dependencies during installation, like "--no-optional", "--ignore-optional", or "--omit=optional". Sentry CLI uses the "optionalDependencies" package.json feature to install the correct binary for your platform and operating system. This post-install script will now try to work around this by manually downloading the Sentry CLI binary from the Sentry CDN. If this fails, you need to remove the "--no-optional", "--ignore-optional", and "--omit=optional" flags for Sentry CLI to work.`
  );

  downloadBinary()
    .then(() => checkVersion())
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
