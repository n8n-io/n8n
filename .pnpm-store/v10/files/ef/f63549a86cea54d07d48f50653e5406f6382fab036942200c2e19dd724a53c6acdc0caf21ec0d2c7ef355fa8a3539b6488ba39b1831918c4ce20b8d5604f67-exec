# selenium-webdriver

Selenium is a browser automation library. Most often used for testing
web-applications, Selenium may be used for any task that requires automating
interaction with the browser.

## Installation

Selenium may be installed via npm with

    npm install selenium-webdriver

You will need to download additional components to work with each of the major
browsers. The drivers for Chrome, Firefox, and Microsoft's IE and Edge web
browsers are all standalone executables that should be placed on your system
[PATH]. Apple's safaridriver (v10 and above) can be found at the
following path – /usr/bin/safaridriver. To enable automation on safari,
you need to run command `safaridriver --enable`.

| Browser           | Component                        |
| :---------------- | :------------------------------- |
| Chrome            | [chromedriver(.exe)][chrome]     |
| Internet Explorer | [IEDriverServer.exe][release]    |
| Edge              | [MicrosoftWebDriver.msi][edge]   |
| Firefox           | [geckodriver(.exe)][geckodriver] |
| Opera             | [operadriver(.exe)][operadriver] |
| Safari            | [safaridriver]                   |

## Usage

The sample below and others are included in the `example` directory. You may
also find the tests for selenium-webdriver informative.

```javascript
const { Builder, Browser, By, Key, until } = require('selenium-webdriver')

;(async function example() {
  let driver = await new Builder().forBrowser(Browser.FIREFOX).build()
  try {
    await driver.get('https://www.google.com/ncr')
    await driver.findElement(By.name('q')).sendKeys('webdriver', Key.RETURN)
    await driver.wait(until.titleIs('webdriver - Google Search'), 1000)
  } finally {
    await driver.quit()
  }
})()
```

### Using the Builder API

The `Builder` class is your one-stop shop for configuring new WebDriver
instances. Rather than clutter your code with branches for the various browsers,
the builder lets you set all options in one flow. When you call
`Builder#build()`, all options irrelevant to the selected browser are dropped:

```javascript
const webdriver = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const firefox = require('selenium-webdriver/firefox')

let driver = new webdriver.Builder()
  .forBrowser(webdriver.Browser.FIREFOX)
  .setChromeOptions(/* ... */)
  .setFirefoxOptions(/* ... */)
  .build()
```

Why would you want to configure options irrelevant to the target browser? The
`Builder`'s API defines your _default_ configuration. You can change the target
browser at runtime through the `SELENIUM_BROWSER` environment variable. For
example, the `example/google_search.js` script is configured to run against
Firefox. You can run the example against other browsers just by changing the
runtime environment

    # cd node_modules/selenium-webdriver
    node example/google_search
    SELENIUM_BROWSER=chrome node example/google_search
    SELENIUM_BROWSER=safari node example/google_search

### The Standalone Selenium Server

The standalone Selenium Server acts as a proxy between your script and the
browser-specific drivers. The server may be used when running locally, but it's
not recommend as it introduces an extra hop for each request and will slow
things down. The server is required, however, to use a browser on a remote host
(most browser drivers, like the IEDriverServer, do not accept remote
connections).

To use the Selenium Server, you will need to install the
[JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html) and
download the latest server from [Selenium][release]. Once downloaded, run the
server with

    java -jar selenium-server-4.27.0.jar standalone

You may configure your tests to run against a remote server through the Builder
API:

```javascript
let driver = new webdriver.Builder()
  .forBrowser(webdriver.Browser.FIREFOX)
  .usingServer('http://localhost:4444/wd/hub')
  .build()
```

Or change the Builder's configuration at runtime with the `SELENIUM_REMOTE_URL`
environment variable:

    SELENIUM_REMOTE_URL="http://localhost:4444/wd/hub" node script.js

You can experiment with these options using the `example/google_search.js`
script provided with `selenium-webdriver`.

## Documentation

API documentation is available online from the [Selenium project][api].
Additional resources include

- the #selenium channel on Libera IRC
- the [selenium-users@googlegroups.com][users] list
- [SeleniumHQ](https://selenium.dev/documentation/) documentation

## Contributing

Contributions are accepted either through [GitHub][gh] pull requests or patches
via the [Selenium issue tracker][issues].

## Node Support Policy

Each version of selenium-webdriver will support the latest _semver-minor_
version of the [LTS] and stable Node releases. All _semver-major_ &
_semver-minor_ versions between the LTS and stable release will have "best
effort" support. Following a Selenium release, any _semver-minor_ Node releases
will also have "best effort" support. Releases older than the latest LTS,
_semver-major_ releases, and all unstable release branches (e.g. "v.Next")
are considered strictly unsupported.

For example, suppose the current LTS and stable releases are v22.13.0 and
v23.6.0,
respectively. Then a Selenium release would have the following support levels:

|  Version   |    Support    |
| :--------: | :-----------: |
| <= 16.20.2 | _unsupported_ |
|  16.20.2   |   supported   |
|   18.8.0   |   supported   |
| >= 22.13.0 |  best effort  |
|   v.Next   | _unsupported_ |

### Support Level Definitions

- _supported:_ A selenium-webdriver release will be API compatible with the
  platform API, without the use of runtime flags.

- _best effort:_ Bugs will be investigated as time permits. API compatibility is
  only guaranteed where required by a _supported_ release. This effectively
  means the adoption of new JS features, such as ES2015 modules, will depend
  on what is supported in Node's LTS.

- _unsupported:_ Bug submissions will be closed as will-not-fix and API
  compatibility is not guaranteed.

### Projected Support Schedule

If Node releases a new [LTS] each October and a new major version every 6
months, the support window for selenium-webdriver will be roughly:

| Release |     Status      | END-OF-LIFE |
| :-----: | :-------------: | :---------: |
|  v18.x  | Maintenance LTS | 2025-04-30  |
|  v19.x  |   End-of-Life   | 2023-06-01  |
|  v20.x  | Maintenance LTS | 2026-04-30  |
|  v21.x  |   End-of-Life   | 2024-06-01  |
|  V22.x  |   Active LTS    | 2027-04-30  |
|  V23.x  |     Current     | 2025-06-01  |

## Issues

Please report any issues using the [Selenium issue tracker][issues]. When using
the issue tracker

- **Do** include a detailed description of the problem.
- **Do** include a link to a [gist](http://gist.github.com/) with any
  interesting stack traces/logs (you may also attach these directly to the bug
  report).
- **Do** include a [reduced test case][reduction]. Reporting "unable to find
  element on the page" is _not_ a valid report - there's nothing for us to
  look into. Expect your bug report to be closed if you do not provide enough
  information for us to investigate.
- **Do not** use the issue tracker to submit basic help requests. All help
  inquiries should be directed to the [user forum][users] or #selenium IRC
  channel.
- **Do not** post empty "I see this too" or "Any updates?" comments. These
  provide no additional information and clutter the log.
- **Do not** report regressions on closed bugs as they are not actively
  monitored for updates (especially bugs that are >6 months old). Please open a
  new issue and reference the original bug in your report.

## License

Licensed to the Software Freedom Conservancy (SFC) under one
or more contributor license agreements. See the NOTICE file
distributed with this work for additional information
regarding copyright ownership. The SFC licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied. See the License for the
specific language governing permissions and limitations
under the License.

[LTS]: https://github.com/nodejs/LTS
[PATH]: http://en.wikipedia.org/wiki/PATH_%28variable%29
[api]: https://www.selenium.dev/selenium/docs/api/javascript/
[chrome]: https://googlechromelabs.github.io/chrome-for-testing/#stable
[gh]: https://github.com/SeleniumHQ/selenium/
[issues]: https://github.com/SeleniumHQ/selenium/issues
[edge]: http://go.microsoft.com/fwlink/?LinkId=619687
[geckodriver]: https://github.com/mozilla/geckodriver/releases/
[reduction]: http://www.webkit.org/quality/reduction.html
[release]: https://www.selenium.dev/downloads/
[users]: https://groups.google.com/forum/#!forum/selenium-users
[safaridriver]: https://developer.apple.com/library/prerelease/content/releasenotes/General/WhatsNewInSafari/Articles/Safari_10_0.html#//apple_ref/doc/uid/TP40014305-CH11-DontLinkElementID_28
[operadriver]: https://github.com/operasoftware/operachromiumdriver/releases
