# scarf-js

![](https://github.com/scarf-sh/scarf-js/workflows/CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40scarf%2Fscarf.svg)](https://badge.fury.io/js/%40scarf%2Fscarf)
<a href="https://www.npmjs.com/package/@scarf/scarf">![](https://img.shields.io/npm/dw/@scarf/scarf)</a>
<img referrerpolicy="no-referrer-when-downgrade" src="https://static.scarf.sh/a.png?x-pxid=fc72d03c-c3a2-4736-b243-10eeff839778" />
<a href="https://tinyurl.com/scarf-community-slack"><img src="https://img.shields.io/badge/Scarf%20Community%20-Slack-blue" alt="Join the Scarf Community Slack" />
  </a>

Scarf is like Google Analytics for your npm packages. By sending some basic
details after installation, this package can help you can gain insight into how
your packages are used and by which companies. Scarf aims to help open-source developers 
fund their work when it is used commercially.

To read more about why we wrote this library, check out [this post](https://github.com/scarf-sh/scarf-js/blob/master/WHY.org) on the topic.

### Features

- No dependencies.
- Fully transparent to the user. Scarf will log its behavior to the console
  during installation. It will never silently report analytics for someone that
  hasn't explictly given permission to do so.
- Never interrupts your package installation. Reporting is done on a best effort basis.

### Installing

You'll first need to create a library entry on [Scarf](https://scarf.sh). Once
created, add a dependency on this library to your own:

```bash
npm i --save @scarf/scarf
```

Once your library is published to npm with this change, Scarf will automatically
collect stats on install, no additional code is required!

Head to your package's dashboard on Scarf to see your reports when available.

### Configuring

Users of your package will be opted in by default and can opt out by setting the
`SCARF_ANALYTICS=false` environment variable. If you'd like Scarf analytics to
instead be opt-in, you can set this by adding an entry to your `package.json`


```json5
// your-package/package.json

{
  // ...
  "scarfSettings": {
    "defaultOptIn": false
  }
  // ...
}
```

Scarf will now be opt-out by default, and users can set `SCARF_ANALYTICS=true`
to opt in.

Regardless of the default state, Scarf will log what it is doing to users who
haven't explictly opted in or out.

By default, scarf-js will only trigger analytics when your package is installed as a dependency of another package, or is being installed globally. This ensures that scarf-js analytics will not be triggered on `npm install` being run _within your project_. To change this, you can add:

```json5
// your-package/package.json

{
  // ...
  "scarfSettings": {
    "allowTopLevel": true
  }
  // ...
}
```


#### Full Configuration Example

```json5
// your-package/package.json

{
  // ...
  "scarfSettings": {
    // Toggles whether Scarf is enabled for this package
    "enabled": true,
    // Enables Scarf when users run npm install directly in your repository
    // Scarf will try to report the Git commit SHA of your repository if it can
    // be obtained.
    "allowTopLevel": true,
    // Users will be opted into analytics by default
    "defaultOptIn": true,
    // By default, Scarf searches for its own location in your build's dependency
    // graph to ensure reporting can be done for all packages using Scarf.
    // For large projects with lots of dependencies, generating that dependency
    // graph takes more time than Scarf allots for its entire process, so Scarf
    // will always time out. `skipTraversal` is an optional flag for large
    // applications to skip that traversal entirely. Use this flag with caution and
    // care, as it will break Scarf analytics for all other packages you depend
    // on in your build.
    "skipTraversal": false
  }
  // ...
}
```

### FAQ

#### What information does scarf-js provide me as a package author?

- Understanding your user-base
  - Which companies are using your package?
  - Is your project growing or shrinking? Where? On which platforms?
- Which versions of your package are being used?

#### As a user of a package using scarf-js, what information does scarf-js send about me?

*Scarf does not store personally identifying information.* Scarf aims to collect information that is helpful for:
- Open Source package maintainence
- Open Source commercialization

Specifically, scarf-js sends:

- The operating system you are using
- Your IP address will be used to look up any available company information. _Scarf does not store the actual IP address_
- Limited dependency tree information. Scarf sends the name and version of the package(s) that directly depend on scarf-js. Additionally, scarf-js will send SHA256-hashed name and version for the following packages in the dependency tree:
  - Packages that depend on a package that depends on scarf-js.
  - The root package of the dependency tree.
This allows Scarf to provide information for maintainers about which public packages are using their own, without exposing identifying details of non-public packages.

You can have scarf-js print the exact JSON payload it sends by setting `SCARF_VERBOSE=true` in your environment.

#### As a user of a package using scarf-js, how can I opt out of analytics?

Scarf's analytics help support developers of the open source packages you are
using, so enabling analytics is appreciated. However, if you'd like to opt out,
you can add your preference to your project's `package.json`:


```json5
// your-package/package.json

{
  // ...
  "scarfSettings": {
    "enabled": false
  }
  // ...
}
```

Alternatively, you can set this variable in your environment:

```shell
export SCARF_ANALYTICS=false
```

You can also set this variable in accordance to the [Console Do Not Track](https://consoledonottrack.com/) standard: 
```shell
export DO_NOT_TRACK=1
```

Either route will disable Scarf for all packages.

#### I distribute a package on npm, and scarf-js is in our dependency tree. Can I disable the analytics for my downstream dependents?

Yes. By opting out of analytics via `package.json`, any package upstream will have analytics disbabled.

```json5
// your-package/package.json

{
  // ...
  "scarfSettings": {
    "enabled": false
  }
  // ...
}
```

Installers of your packages will have scarf-js disabled for all dependencies upstream from yours.


### Developing

Setting the environment variable `SCARF_LOCAL_PORT=8080` will configure Scarf to
use http://localhost:8080 as the analytics endpoint host.

### Future work

Future releases of scarf-js will provide a module of utility functions to
collect usage analytics in addition to the current installation analytics.

### Community

Join the [Scarf-Community workspace](https://tinyurl.com/scarf-community-slack) on Slack and find us in the #scarf-js channel. We'll keep an eye out for your questions and concerns. 
