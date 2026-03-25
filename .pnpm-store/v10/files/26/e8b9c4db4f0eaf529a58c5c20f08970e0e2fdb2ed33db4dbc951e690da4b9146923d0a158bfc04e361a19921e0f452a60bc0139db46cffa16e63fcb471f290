import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { defineIntegration } from '@sentry/core';

/* eslint-disable max-lines */


const readFileAsync = promisify(readFile);
const readDirAsync = promisify(readdir);

// Process enhanced with methods from Node 18, 20, 22 as @types/node
// is on `14.18.0` to match minimum version requirements of the SDK

const INTEGRATION_NAME = 'Context';

const _nodeContextIntegration = ((options = {}) => {
  let cachedContext;

  const _options = {
    app: true,
    os: true,
    device: true,
    culture: true,
    cloudResource: true,
    ...options,
  };

  /** Add contexts to the event. Caches the context so we only look it up once. */
  async function addContext(event) {
    if (cachedContext === undefined) {
      cachedContext = _getContexts();
    }

    const updatedContext = _updateContext(await cachedContext);

    // TODO(v11): conditional with `sendDefaultPii` here?
    event.contexts = {
      ...event.contexts,
      app: { ...updatedContext.app, ...event.contexts?.app },
      os: { ...updatedContext.os, ...event.contexts?.os },
      device: { ...updatedContext.device, ...event.contexts?.device },
      culture: { ...updatedContext.culture, ...event.contexts?.culture },
      cloud_resource: { ...updatedContext.cloud_resource, ...event.contexts?.cloud_resource },
    };

    return event;
  }

  /** Get the contexts from node. */
  async function _getContexts() {
    const contexts = {};

    if (_options.os) {
      contexts.os = await getOsContext();
    }

    if (_options.app) {
      contexts.app = getAppContext();
    }

    if (_options.device) {
      contexts.device = getDeviceContext(_options.device);
    }

    if (_options.culture) {
      const culture = getCultureContext();

      if (culture) {
        contexts.culture = culture;
      }
    }

    if (_options.cloudResource) {
      contexts.cloud_resource = getCloudResourceContext();
    }

    return contexts;
  }

  return {
    name: INTEGRATION_NAME,
    processEvent(event) {
      return addContext(event);
    },
  };
}) ;

/**
 * Capture context about the environment and the device that the client is running on, to events.
 */
const nodeContextIntegration = defineIntegration(_nodeContextIntegration);

/**
 * Updates the context with dynamic values that can change
 */
function _updateContext(contexts) {
  // Only update properties if they exist

  if (contexts.app?.app_memory) {
    contexts.app.app_memory = process.memoryUsage().rss;
  }

  if (contexts.app?.free_memory && typeof (process ).availableMemory === 'function') {
    const freeMemory = (process ).availableMemory?.();
    if (freeMemory != null) {
      contexts.app.free_memory = freeMemory;
    }
  }

  if (contexts.device?.free_memory) {
    contexts.device.free_memory = os.freemem();
  }

  return contexts;
}

/**
 * Returns the operating system context.
 *
 * Based on the current platform, this uses a different strategy to provide the
 * most accurate OS information. Since this might involve spawning subprocesses
 * or accessing the file system, this should only be executed lazily and cached.
 *
 *  - On macOS (Darwin), this will execute the `sw_vers` utility. The context
 *    has a `name`, `version`, `build` and `kernel_version` set.
 *  - On Linux, this will try to load a distribution release from `/etc` and set
 *    the `name`, `version` and `kernel_version` fields.
 *  - On all other platforms, only a `name` and `version` will be returned. Note
 *    that `version` might actually be the kernel version.
 */
async function getOsContext() {
  const platformId = os.platform();
  switch (platformId) {
    case 'darwin':
      return getDarwinInfo();
    case 'linux':
      return getLinuxInfo();
    default:
      return {
        name: PLATFORM_NAMES[platformId] || platformId,
        version: os.release(),
      };
  }
}

function getCultureContext() {
  try {
    if (typeof process.versions.icu !== 'string') {
      // Node was built without ICU support
      return;
    }

    // Check that node was built with full Intl support. Its possible it was built without support for non-English
    // locales which will make resolvedOptions inaccurate
    //
    // https://nodejs.org/api/intl.html#detecting-internationalization-support
    const january = new Date(9e8);
    const spanish = new Intl.DateTimeFormat('es', { month: 'long' });
    if (spanish.format(january) === 'enero') {
      const options = Intl.DateTimeFormat().resolvedOptions();

      return {
        locale: options.locale,
        timezone: options.timeZone,
      };
    }
  } catch {
    //
  }

  return;
}

/**
 * Get app context information from process
 */
function getAppContext() {
  const app_memory = process.memoryUsage().rss;
  // eslint-disable-next-line @sentry-internal/sdk/no-unsafe-random-apis
  const app_start_time = new Date(Date.now() - process.uptime() * 1000).toISOString();
  // https://nodejs.org/api/process.html#processavailablememory
  const appContext = { app_start_time, app_memory };

  if (typeof (process ).availableMemory === 'function') {
    const freeMemory = (process ).availableMemory?.();
    if (freeMemory != null) {
      appContext.free_memory = freeMemory;
    }
  }

  return appContext;
}

/**
 * Gets device information from os
 */
function getDeviceContext(deviceOpt) {
  const device = {};

  // Sometimes os.uptime() throws due to lacking permissions: https://github.com/getsentry/sentry-javascript/issues/8202
  let uptime;
  try {
    uptime = os.uptime();
  } catch {
    // noop
  }

  // os.uptime or its return value seem to be undefined in certain environments (e.g. Azure functions).
  // Hence, we only set boot time, if we get a valid uptime value.
  // @see https://github.com/getsentry/sentry-javascript/issues/5856
  if (typeof uptime === 'number') {
    // eslint-disable-next-line @sentry-internal/sdk/no-unsafe-random-apis
    device.boot_time = new Date(Date.now() - uptime * 1000).toISOString();
  }

  device.arch = os.arch();

  if (deviceOpt === true || deviceOpt.memory) {
    device.memory_size = os.totalmem();
    device.free_memory = os.freemem();
  }

  if (deviceOpt === true || deviceOpt.cpu) {
    const cpuInfo = os.cpus() ;
    const firstCpu = cpuInfo?.[0];
    if (firstCpu) {
      device.processor_count = cpuInfo.length;
      device.cpu_description = firstCpu.model;
      device.processor_frequency = firstCpu.speed;
    }
  }

  return device;
}

/** Mapping of Node's platform names to actual OS names. */
const PLATFORM_NAMES = {
  aix: 'IBM AIX',
  freebsd: 'FreeBSD',
  openbsd: 'OpenBSD',
  sunos: 'SunOS',
  win32: 'Windows',
  ohos: 'OpenHarmony',
  android: 'Android',
};

/** Linux version file to check for a distribution. */

/** Mapping of linux release files located in /etc to distributions. */
const LINUX_DISTROS = [
  { name: 'fedora-release', distros: ['Fedora'] },
  { name: 'redhat-release', distros: ['Red Hat Linux', 'Centos'] },
  { name: 'redhat_version', distros: ['Red Hat Linux'] },
  { name: 'SuSE-release', distros: ['SUSE Linux'] },
  { name: 'lsb-release', distros: ['Ubuntu Linux', 'Arch Linux'] },
  { name: 'debian_version', distros: ['Debian'] },
  { name: 'debian_release', distros: ['Debian'] },
  { name: 'arch-release', distros: ['Arch Linux'] },
  { name: 'gentoo-release', distros: ['Gentoo Linux'] },
  { name: 'novell-release', distros: ['SUSE Linux'] },
  { name: 'alpine-release', distros: ['Alpine Linux'] },
];

/** Functions to extract the OS version from Linux release files. */
const LINUX_VERSIONS

 = {
  alpine: content => content,
  arch: content => matchFirst(/distrib_release=(.*)/, content),
  centos: content => matchFirst(/release ([^ ]+)/, content),
  debian: content => content,
  fedora: content => matchFirst(/release (..)/, content),
  mint: content => matchFirst(/distrib_release=(.*)/, content),
  red: content => matchFirst(/release ([^ ]+)/, content),
  suse: content => matchFirst(/VERSION = (.*)\n/, content),
  ubuntu: content => matchFirst(/distrib_release=(.*)/, content),
};

/**
 * Executes a regular expression with one capture group.
 *
 * @param regex A regular expression to execute.
 * @param text Content to execute the RegEx on.
 * @returns The captured string if matched; otherwise undefined.
 */
function matchFirst(regex, text) {
  const match = regex.exec(text);
  return match ? match[1] : undefined;
}

/** Loads the macOS operating system context. */
async function getDarwinInfo() {
  // Default values that will be used in case no operating system information
  // can be loaded. The default version is computed via heuristics from the
  // kernel version, but the build ID is missing.
  const darwinInfo = {
    kernel_version: os.release(),
    name: 'Mac OS X',
    version: `10.${Number(os.release().split('.')[0]) - 4}`,
  };

  try {
    // We try to load the actual macOS version by executing the `sw_vers` tool.
    // This tool should be available on every standard macOS installation. In
    // case this fails, we stick with the values computed above.

    const output = await new Promise((resolve, reject) => {
      execFile('/usr/bin/sw_vers', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });

    darwinInfo.name = matchFirst(/^ProductName:\s+(.*)$/m, output);
    darwinInfo.version = matchFirst(/^ProductVersion:\s+(.*)$/m, output);
    darwinInfo.build = matchFirst(/^BuildVersion:\s+(.*)$/m, output);
  } catch {
    // ignore
  }

  return darwinInfo;
}

/** Returns a distribution identifier to look up version callbacks. */
function getLinuxDistroId(name) {
  return (name.split(' ') )[0].toLowerCase();
}

/** Loads the Linux operating system context. */
async function getLinuxInfo() {
  // By default, we cannot assume anything about the distribution or Linux
  // version. `os.release()` returns the kernel version and we assume a generic
  // "Linux" name, which will be replaced down below.
  const linuxInfo = {
    kernel_version: os.release(),
    name: 'Linux',
  };

  try {
    // We start guessing the distribution by listing files in the /etc
    // directory. This is were most Linux distributions (except Knoppix) store
    // release files with certain distribution-dependent meta data. We search
    // for exactly one known file defined in `LINUX_DISTROS` and exit if none
    // are found. In case there are more than one file, we just stick with the
    // first one.
    const etcFiles = await readDirAsync('/etc');
    const distroFile = LINUX_DISTROS.find(file => etcFiles.includes(file.name));
    if (!distroFile) {
      return linuxInfo;
    }

    // Once that file is known, load its contents. To make searching in those
    // files easier, we lowercase the file contents. Since these files are
    // usually quite small, this should not allocate too much memory and we only
    // hold on to it for a very short amount of time.
    const distroPath = join('/etc', distroFile.name);
    const contents = (await readFileAsync(distroPath, { encoding: 'utf-8' })).toLowerCase();

    // Some Linux distributions store their release information in the same file
    // (e.g. RHEL and Centos). In those cases, we scan the file for an
    // identifier, that basically consists of the first word of the linux
    // distribution name (e.g. "red" for Red Hat). In case there is no match, we
    // just assume the first distribution in our list.
    const { distros } = distroFile;
    linuxInfo.name = distros.find(d => contents.indexOf(getLinuxDistroId(d)) >= 0) || distros[0];

    // Based on the found distribution, we can now compute the actual version
    // number. This is different for every distribution, so several strategies
    // are computed in `LINUX_VERSIONS`.
    const id = getLinuxDistroId(linuxInfo.name);
    linuxInfo.version = LINUX_VERSIONS[id]?.(contents);
  } catch {
    // ignore
  }

  return linuxInfo;
}

/**
 * Grabs some information about hosting provider based on best effort.
 */
function getCloudResourceContext() {
  if (process.env.VERCEL) {
    // https://vercel.com/docs/concepts/projects/environment-variables/system-environment-variables#system-environment-variables
    return {
      'cloud.provider': 'vercel',
      'cloud.region': process.env.VERCEL_REGION,
    };
  } else if (process.env.AWS_REGION) {
    // https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
    return {
      'cloud.provider': 'aws',
      'cloud.region': process.env.AWS_REGION,
      'cloud.platform': process.env.AWS_EXECUTION_ENV,
    };
  } else if (process.env.GCP_PROJECT) {
    // https://cloud.google.com/composer/docs/how-to/managing/environment-variables#reserved_variables
    return {
      'cloud.provider': 'gcp',
    };
  } else if (process.env.ALIYUN_REGION_ID) {
    // TODO: find where I found these environment variables - at least gc.github.com returns something
    return {
      'cloud.provider': 'alibaba_cloud',
      'cloud.region': process.env.ALIYUN_REGION_ID,
    };
  } else if (process.env.WEBSITE_SITE_NAME && process.env.REGION_NAME) {
    // https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings?tabs=kudu%2Cdotnet#app-environment
    return {
      'cloud.provider': 'azure',
      'cloud.region': process.env.REGION_NAME,
    };
  } else if (process.env.IBM_CLOUD_REGION) {
    // TODO: find where I found these environment variables - at least gc.github.com returns something
    return {
      'cloud.provider': 'ibm_cloud',
      'cloud.region': process.env.IBM_CLOUD_REGION,
    };
  } else if (process.env.TENCENTCLOUD_REGION) {
    // https://www.tencentcloud.com/document/product/583/32748
    return {
      'cloud.provider': 'tencent_cloud',
      'cloud.region': process.env.TENCENTCLOUD_REGION,
      'cloud.account.id': process.env.TENCENTCLOUD_APPID,
      'cloud.availability_zone': process.env.TENCENTCLOUD_ZONE,
    };
  } else if (process.env.NETLIFY) {
    // https://docs.netlify.com/configure-builds/environment-variables/#read-only-variables
    return {
      'cloud.provider': 'netlify',
    };
  } else if (process.env.FLY_REGION) {
    // https://fly.io/docs/reference/runtime-environment/
    return {
      'cloud.provider': 'fly.io',
      'cloud.region': process.env.FLY_REGION,
    };
  } else if (process.env.DYNO) {
    // https://devcenter.heroku.com/articles/dynos#local-environment-variables
    return {
      'cloud.provider': 'heroku',
    };
  } else {
    return undefined;
  }
}

export { getAppContext, getDeviceContext, nodeContextIntegration, readDirAsync, readFileAsync };
//# sourceMappingURL=context.js.map
