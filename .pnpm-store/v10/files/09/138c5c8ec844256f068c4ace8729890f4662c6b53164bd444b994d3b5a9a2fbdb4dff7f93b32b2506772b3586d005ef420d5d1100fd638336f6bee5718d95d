'use strict';

const { execFileSync } = require('child_process');
const { readFileSync, statSync } = require('fs');
const { win32: path } = require('path');

const modernMSBuildPath = (() => {
  let arch;
  switch (process.arch) {
    case 'x64':
      arch = 'amd64';
      break;
    case 'arm64':
      arch = process.arch;
      break;
    default:
      arch = '';
  }
  return path.join('MSBuild', 'Current', 'Bin', arch, 'MSBuild.exe');
})();
const VS_VERSIONS_MODERN = new Map([
  [15, {
    year: 2017,
    msbuild: path.join('MSBuild', '15.0', 'Bin', 'MSBuild.exe'),
    toolset: 'v141',
  }],
  [16, {
    year: 2019,
    msbuild: path.join('MSBuild', 'Current', 'Bin', 'MSBuild.exe'),
    toolset: 'v142',
  }],
  [17, {
    year: 2022,
    msbuild: modernMSBuildPath,
    toolset: 'v143',
  }],
  [18, {
    year: 2026,
    msbuild: modernMSBuildPath,
    toolset: 'v145',
  }],
]);
const PACKAGES = {
  msbuild: /^Microsoft[.]VisualStudio[.]VC[.]MSBuild[.](?:v\d+[.])?Base$/i,
  vctools: /^Microsoft[.]VisualStudio[.]Component[.]VC[.]Tools[.](x86[.]x64|ARM64)$/i,
  express: /^Microsoft[.]VisualStudio[.]WDExpress$/i,
  winsdk:
    /^Microsoft[.]VisualStudio[.]Component[.]Windows(81|10|11)SDK(?:[.](\d+)(?:[.]Desktop.*)?)?$/,
};
const SDK_REG = 'HKLM\\Software\\Microsoft\\Microsoft SDKs\\Windows';
const SDK32_REG =
  'HKLM\\Software\\Wow6432Node\\Microsoft\\Microsoft SDKs\\Windows';

function checkRequiredPackages(packages) {
  if (!Array.isArray(packages))
    return false;

  let foundMSBuild = false;
  let foundVCTools = false;
  let foundExpress = false;
  for (const pkg of packages) {
    if (!foundMSBuild && PACKAGES.msbuild.test(pkg))
      foundMSBuild = true;
    else if (!foundVCTools && PACKAGES.vctools.test(pkg))
      foundVCTools = true;
    else if (!foundExpress && PACKAGES.express.test(pkg))
      foundExpress = true;

    if (foundMSBuild && (foundVCTools || foundExpress))
      return true;
  }
}

// Sorts newest to oldest
function versionStringCompare(a, b) {
  const splitA = a.split('.');
  const splitB = b.split('.');
  const len = Math.min(splitA.length, splitB.length);
  for (let i = 0; i < len; ++i) {
    const nA = parseInt(splitA[i], 10);
    const nB = parseInt(splitB[i], 10);
    if (nA > nB)
      return -1;
    if (nA < nB)
      return 1;
  }
  if (splitA.length > splitB.length)
    return -1;
  else if (splitA.length < splitB.length)
    return 1;
  return 0;
}

function sdkVersionCompare(a, b) {
  return versionStringCompare(a.fullVersion, b.fullVersion);
}

function getSDKPaths(fullVer) {
  if (typeof fullVer !== 'string' || !fullVer)
    return;
  try {
    const arch = (process.arch === 'ia32' ? 'x86' : process.arch);
    const shortVer = `v${/^\d+[.]\d+/.exec(fullVer)[0]}`;
    let verPath = getRegValue(`${SDK_REG}\\${shortVer}`, 'InstallationFolder');
    if (!verPath)
      verPath = getRegValue(`${SDK32_REG}\\${shortVer}`, 'InstallationFolder');
    if (!verPath)
      return;

    // Includes
    const includePaths = [];
    for (const type of ['shared', 'um', 'ucrt']) {
      const testPath = path.resolve(verPath, 'Include', fullVer, type);
      statSync(testPath);
      includePaths.push(testPath);
    }

    // Libraries
    const libPaths = [];
    for (const type of ['um', 'ucrt']) {
      const testPath = path.resolve(verPath, 'Lib', fullVer, type, arch);
      statSync(testPath);
      libPaths.push(testPath);
    }

    return { includePaths, libPaths };
  } catch {}
}

const execOpts = {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
};

function findModernVS() {
  const versions = [];
  const ps = path.join(
    process.env.SystemRoot,
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  );
  const cs = path.resolve(__dirname, '..', 'deps', 'Find-VisualStudio.cs');
  const args = [
    '-ExecutionPolicy',
    'Unrestricted',
    '-NoProfile',
    '-Command',
    `&{Add-Type -Path '${cs}';[VisualStudioConfiguration.Main]::PrintJson()}`
  ];
  try {
    const out = execFileSync(ps, args, execOpts);
    const info = JSON.parse(out);
    if (Array.isArray(info)) {
      for (const vs of info) {
        const vsPath = path.resolve(vs.path);
        let vsVer = /^(?<major>\d+)[.](?<minor>\d+)[.]/.exec(vs.version);
        if (!vsVer)
          continue;
        vsVer = {
          full: vs.version,
          major: +vsVer.groups.major,
          minor: +vsVer.groups.minor,
        };
        const verInfo = VS_VERSIONS_MODERN.get(vsVer.major);
        if (verInfo === undefined)
          continue;
        if (!checkRequiredPackages(vs.packages))
          continue;
        const vsSDKs = [];
        for (const pkg of vs.packages) {
          let fullVersion;
          let version;
          const m = PACKAGES.winsdk.exec(pkg);
          if (!m)
            continue;
          const sdk = m[1];
          switch (sdk) {
            case '81':
              fullVersion = version = '8.1';
              break;
            case '10':
            case '11': {
              if (m[2] === undefined)
                continue;
              const sdkVer = parseInt(m[2], 10);
              if (!isFinite(sdkVer) || sdkVer < 0)
                continue;
              fullVersion = `10.0.${sdkVer}.0`;
              version = '10.0';
              break;
            }
          }
          const paths = getSDKPaths(fullVersion);
          if (!paths)
            continue;
          vsSDKs.push({
            version,
            fullVersion,
            ...paths,
          });
        }
        if (vsSDKs.length === 0)
          continue;
        let clPath;
        const includePaths = [];
        const libPaths = [];
        try {
          let vcVerFile;
          let clVer;
          try {
            vcVerFile = path.join(
              vsPath,
              'VC',
              'Auxiliary',
              'Build',
              `Microsoft.VCToolsVersion.${verInfo.toolset}.default.txt`
            );
            clVer = readFileSync(vcVerFile, { encoding: 'utf8' }).trim();
          } catch {}
          if (!clVer) {
            vcVerFile = path.join(
              vsPath,
              'VC',
              'Auxiliary',
              'Build',
              'Microsoft.VCToolsVersion.default.txt'
            );
            clVer = readFileSync(vcVerFile, { encoding: 'utf8' }).trim();
          }
          const arch = (process.arch === 'ia32' ? 'x86' : process.arch);
          let testPath = path.join(
            vsPath,
            'VC',
            'Tools',
            'MSVC',
            clVer,
            'bin',
            `Host${arch}`,
            arch,
            'cl.exe'
          );
          statSync(testPath);
          clPath = testPath;

          testPath = path.join(
            vsPath,
            'VC',
            'Tools',
            'MSVC',
            clVer,
            'include'
          );
          statSync(testPath);
          includePaths.push(testPath);

          testPath = path.join(
            vsPath,
            'VC',
            'Tools',
            'MSVC',
            clVer,
            'lib',
            arch
          );
          statSync(testPath);
          libPaths.push(testPath);
        } catch {
          continue;
        }
        vsSDKs.sort(sdkVersionCompare);
        versions.push({
          path: vsPath,
          version: vsVer,
          sdks: vsSDKs,
          ...verInfo,
          msbuild: path.join(vsPath, verInfo.msbuild),
          cl: clPath,
          includePaths,
          libPaths,
        });
      }
    }
  } catch {}
  return versions;
}

const VS_VERSIONS_OLDER = [
  {
    version: { full: '12.0', major: 12, minor: 0 },
    year: 2013,
    toolset: 'v120',
  },
  {
    version: { full: '14.0', major: 14, minor: 0 },
    year: 2015,
    toolset: 'v140',
  },
];

const VC_REG = 'HKLM\\Software\\Microsoft\\VisualStudio\\SxS\\VC7';
const VC32_REG =
  'HKLM\\Software\\Wow6432Node\\Microsoft\\VisualStudio\\SxS\\VC7';
const MSBUILD_REG = 'HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions';

function getRegValue(key, value, use32) {
  const extraArgs = (use32 ? [ '/reg:32' ] : []);
  const regexp = new RegExp(`^\\s+${value}\\s+REG_\\w+\\s+(\\S.*)$`, 'im');
  const reg = path.join(process.env.SystemRoot, 'System32', 'reg.exe');
  const args = [ 'query', key, '/v', value, ...extraArgs ];

  try {
    const out = execFileSync(reg, args, execOpts);
    const m = regexp.exec(out);
    if (m)
      return m[1];
  } catch {}
}

function findOlderVS() {
  const versions = [];
  try {
    for (const vs of VS_VERSIONS_OLDER) {
      let vsPath = getRegValue(VC_REG, vs.version.full);
      if (!vsPath)
        vsPath = getRegValue(VC32_REG, vs.version.full);
      if (!vsPath)
        continue;
      vsPath = path.resolve(vsPath, '..');

      const msbuildPath = getRegValue(
        `${MSBUILD_REG}\\${vs.version.full}`,
        'MSBuildToolsPath',
        (process.arch === 'ia32')
      );
      if (!msbuildPath)
        continue;
      versions.push({
        path: vsPath,
        ...vs,
        msbuild: path.join(msbuildPath, 'MSBuild.exe'),
        cl: path.join(vsPath, 'VC', 'bin', 'cl.exe'),
        includePaths: [path.join(vsPath, 'VC', 'include')],
        libPaths: [path.join(vsPath, 'VC', 'lib')],
        sdks: [],
      });
    }
  } catch {}
  return versions;
}

module.exports = () => {
  const versions = findModernVS().concat(findOlderVS());
  // Sorts newest to oldest
  versions.sort((a, b) => {
    return versionStringCompare(a.version.full, b.version.full);
  });
  return versions;
};
