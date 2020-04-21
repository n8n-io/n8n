# Troubleshooting

## Windows

If you are experiencing issues running n8n with the typical flow of:

```powershell
npx n8n
```

### Requirements

Please ensure that you have the following requirements fulfilled:

- Install latest version of [NodeJS](https://nodejs.org/en/download/)
- Install [Python 2.7](https://www.python.org/downloads/release/python-2717/) (It is okay to have multiple versions installed on the machine)
- Windows SDK
- C++ Desktop Development Tools
- Windows Build Tools

#### Install build tools

If you haven't satisfied the above, follow this procedure through your PowerShell (run with administrative privileges).
This command installs the build tools, windows SDK and the C++ development tools in one package.

```powershell
npm install --global --production windows-build-tools
```

#### Configure npm to use Python version 2.7

```powershell
npm config set python python2.7
```

#### Configure npm to use correct msvs version

```powershell
npm config set msvs_version 2017 --global
```

### Lesser known issues:

#### mmmagic npm package when using MSbuild tools with Visual Studio

While installing this package, `node-gyp` is run and it might fail to install it with an error appearing in the ballpark of:

```
gyp ERR! stack Error: spawn C:\Program Files (x86)\Microsoft Visual Studio\2019\**Enterprise**\MSBuild\Current\Bin\MSBuild.exe ENOENT
```

It is seeking the `MSBuild.exe` in a directory that does not exist. If you are using Visual Studio Community or vice versa, you can change the path of MSBuild with command: 

```powershell
npm config set msbuild_path "C:\Program Files (x86)\Microsoft Visual Studio\2019\**Community**\MSBuild\Current\Bin\MSBuild.exe"
```

Attempt to install package again after running the command above.
