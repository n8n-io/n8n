// Copyright 2017 Lovell Fuller and others.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const childProcess = require('child_process');
const { isLinux, getReport } = require('./process');
const { LDD_PATH, readFile, readFileSync } = require('./filesystem');

let cachedFamilyFilesystem;
let cachedVersionFilesystem;

const command = 'getconf GNU_LIBC_VERSION 2>&1 || true; ldd --version 2>&1 || true';
let commandOut = '';

const safeCommand = () => {
  if (!commandOut) {
    return new Promise((resolve) => {
      childProcess.exec(command, (err, out) => {
        commandOut = err ? ' ' : out;
        resolve(commandOut);
      });
    });
  }
  return commandOut;
};

const safeCommandSync = () => {
  if (!commandOut) {
    try {
      commandOut = childProcess.execSync(command, { encoding: 'utf8' });
    } catch (_err) {
      commandOut = ' ';
    }
  }
  return commandOut;
};

/**
 * A String constant containing the value `glibc`.
 * @type {string}
 * @public
 */
const GLIBC = 'glibc';

/**
 * A Regexp constant to get the GLIBC Version.
 * @type {string}
 */
const RE_GLIBC_VERSION = /GLIBC\s(\d+\.\d+)/;

/**
 * A String constant containing the value `musl`.
 * @type {string}
 * @public
 */
const MUSL = 'musl';

/**
 * This string is used to find if the {@link LDD_PATH} is GLIBC
 * @type {string}
 */
const GLIBC_ON_LDD = GLIBC.toUpperCase();

/**
 * This string is used to find if the {@link LDD_PATH} is musl
 * @type {string}
 */
const MUSL_ON_LDD = MUSL.toLowerCase();

const isFileMusl = (f) => f.includes('libc.musl-') || f.includes('ld-musl-');

const familyFromReport = () => {
  const report = getReport();
  if (report.header && report.header.glibcVersionRuntime) {
    return GLIBC;
  }
  if (Array.isArray(report.sharedObjects)) {
    if (report.sharedObjects.some(isFileMusl)) {
      return MUSL;
    }
  }
  return null;
};

const familyFromCommand = (out) => {
  const [getconf, ldd1] = out.split(/[\r\n]+/);
  if (getconf && getconf.includes(GLIBC)) {
    return GLIBC;
  }
  if (ldd1 && ldd1.includes(MUSL)) {
    return MUSL;
  }
  return null;
};

const getFamilyFromLddContent = (content) => {
  if (content.includes(MUSL_ON_LDD)) {
    return MUSL;
  }
  if (content.includes(GLIBC_ON_LDD)) {
    return GLIBC;
  }
  return null;
};

const familyFromFilesystem = async () => {
  if (cachedFamilyFilesystem !== undefined) {
    return cachedFamilyFilesystem;
  }
  cachedFamilyFilesystem = null;
  try {
    const lddContent = await readFile(LDD_PATH);
    cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
  } catch (e) {}
  return cachedFamilyFilesystem;
};

const familyFromFilesystemSync = () => {
  if (cachedFamilyFilesystem !== undefined) {
    return cachedFamilyFilesystem;
  }
  cachedFamilyFilesystem = null;
  try {
    const lddContent = readFileSync(LDD_PATH);
    cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
  } catch (e) {}
  return cachedFamilyFilesystem;
};

/**
 * Resolves with the libc family when it can be determined, `null` otherwise.
 * @returns {Promise<?string>}
 */
const family = async () => {
  let family = null;
  if (isLinux()) {
    family = await familyFromFilesystem();
    if (!family) {
      family = familyFromReport();
    }
    if (!family) {
      const out = await safeCommand();
      family = familyFromCommand(out);
    }
  }
  return family;
};

/**
 * Returns the libc family when it can be determined, `null` otherwise.
 * @returns {?string}
 */
const familySync = () => {
  let family = null;
  if (isLinux()) {
    family = familyFromFilesystemSync();
    if (!family) {
      family = familyFromReport();
    }
    if (!family) {
      const out = safeCommandSync();
      family = familyFromCommand(out);
    }
  }
  return family;
};

/**
 * Resolves `true` only when the platform is Linux and the libc family is not `glibc`.
 * @returns {Promise<boolean>}
 */
const isNonGlibcLinux = async () => isLinux() && await family() !== GLIBC;

/**
 * Returns `true` only when the platform is Linux and the libc family is not `glibc`.
 * @returns {boolean}
 */
const isNonGlibcLinuxSync = () => isLinux() && familySync() !== GLIBC;

const versionFromFilesystem = async () => {
  if (cachedVersionFilesystem !== undefined) {
    return cachedVersionFilesystem;
  }
  cachedVersionFilesystem = null;
  try {
    const lddContent = await readFile(LDD_PATH);
    const versionMatch = lddContent.match(RE_GLIBC_VERSION);
    if (versionMatch) {
      cachedVersionFilesystem = versionMatch[1];
    }
  } catch (e) {}
  return cachedVersionFilesystem;
};

const versionFromFilesystemSync = () => {
  if (cachedVersionFilesystem !== undefined) {
    return cachedVersionFilesystem;
  }
  cachedVersionFilesystem = null;
  try {
    const lddContent = readFileSync(LDD_PATH);
    const versionMatch = lddContent.match(RE_GLIBC_VERSION);
    if (versionMatch) {
      cachedVersionFilesystem = versionMatch[1];
    }
  } catch (e) {}
  return cachedVersionFilesystem;
};

const versionFromReport = () => {
  const report = getReport();
  if (report.header && report.header.glibcVersionRuntime) {
    return report.header.glibcVersionRuntime;
  }
  return null;
};

const versionSuffix = (s) => s.trim().split(/\s+/)[1];

const versionFromCommand = (out) => {
  const [getconf, ldd1, ldd2] = out.split(/[\r\n]+/);
  if (getconf && getconf.includes(GLIBC)) {
    return versionSuffix(getconf);
  }
  if (ldd1 && ldd2 && ldd1.includes(MUSL)) {
    return versionSuffix(ldd2);
  }
  return null;
};

/**
 * Resolves with the libc version when it can be determined, `null` otherwise.
 * @returns {Promise<?string>}
 */
const version = async () => {
  let version = null;
  if (isLinux()) {
    version = await versionFromFilesystem();
    if (!version) {
      version = versionFromReport();
    }
    if (!version) {
      const out = await safeCommand();
      version = versionFromCommand(out);
    }
  }
  return version;
};

/**
 * Returns the libc version when it can be determined, `null` otherwise.
 * @returns {?string}
 */
const versionSync = () => {
  let version = null;
  if (isLinux()) {
    version = versionFromFilesystemSync();
    if (!version) {
      version = versionFromReport();
    }
    if (!version) {
      const out = safeCommandSync();
      version = versionFromCommand(out);
    }
  }
  return version;
};

module.exports = {
  GLIBC,
  MUSL,
  family,
  familySync,
  isNonGlibcLinux,
  isNonGlibcLinuxSync,
  version,
  versionSync
};
