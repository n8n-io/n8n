# isbot 🤖/👨‍🦰

[![](https://img.shields.io/npm/v/isbot.svg?style=flat-square)](https://www.npmjs.com/package/isbot) [![](https://img.shields.io/npm/dt/isbot?style=flat-square)](https://www.npmjs.com/package/isbot) [![](https://img.shields.io/circleci/build/github/omrilotan/isbot?style=flat-square)](https://circleci.com/gh/omrilotan/isbot) [![](https://img.shields.io/github/last-commit/omrilotan/isbot?style=flat-square)](https://github.com/omrilotan/isbot/graphs/commit-activity) [![](https://badgen.net/discord/online-members/yzRmGaDH?icon=discord&label=&style=flat-square)](https://discord.gg/yzRmGaDH)

[![](./page/isbot.svg)](https://isbot.js.org)

Detect bots/crawlers/spiders using the user agent string.

## Usage

```js
import isbot from 'isbot'

// Nodejs HTTP
isbot(request.getHeader('User-Agent'))

// ExpressJS
isbot(req.get('user-agent'))

// Browser
isbot(navigator.userAgent)

// User Agent string
isbot('Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)') // true
isbot('Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36') // false
```

## Additional functionality

### Extend: Add user agent patterns
Add rules to user agent match RegExp: Array of strings

```js
isbot('Mozilla/5.0 (X11) Firefox/111.0') // false
isbot.extend([
    'istat',
    'x11'
])
isbot('Mozilla/5.0 (X11) Firefox/111.0') // true
```

### Exclude: Remove matches of known crawlers
Remove rules to user agent match RegExp (see existing rules in `src/list.json` file)

```js
isbot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4590.2 Safari/537.36 Chrome-Lighthouse') // true
isbot.exclude(['chrome-lighthouse']) // pattern is case insensitive
isbot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4590.2 Safari/537.36 Chrome-Lighthouse') // false
```

### Find: Verbose result
Return the respective match for bot user agent rule
```js
isbot.find('Mozilla/5.0 (X11; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0 DejaClick/2.9.7.2') // 'DejaClick'
```

### Matches: Get patterns
Return all patterns that match the user agent string
```js
isbot.matches('Mozilla/5.0 (X11; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0 SearchRobot/1.0') // ['bot', 'search']
```

### Clear:
Remove all matching patterns so this user agent string will pass
```js
const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0 SearchRobot/1.0';
isbot(ua) // true
isbot.clear(ua)
isbot(ua) // false
```

### Spawn: Create new instances
Create new instances of isbot. Instance is spawned using spawner's list as base
```js
const one = isbot.spawn()
const two = isbot.spawn()

two.exclude(['chrome-lighthouse'])
one('Chrome-Lighthouse') // true
two('Chrome-Lighthouse') // false
```
Create isbot using custom list (**instead** of the maintained list)
```js
const lean = isbot.spawn([ 'bot' ])
lean('Googlebot') // true
lean('Chrome-Lighthouse') // false
```

### Get a copy of the Regular Expression pattern
```js
const { pattern } = isbot
```

## Definitions
-   **Bot.** Autonomous program imitating or replacing some aspect of a human behaviour, performing repetitive tasks much faster than human users could.
-   **Good bot.** Automated programs who visit websites in order to collect useful information. Web crawlers, site scrapers, stress testers, preview builders and other programs are welcomed on most websites because they serve purposes of mutual benefits.
-   **Bad bot.** Programs which are designed to perform malicious actions, ultimately hurting businesses. Testing credential databases, DDoS attacks, spam bots.

## Clarifications
### What does "isbot" do?
This package aims to identify "Good bots". Those who voluntarily identify themselves by setting a unique, preferably descriptive, user agent, usually by setting a dedicated request header.

### What doesn't "isbot" do?
It does not try to recognise malicious bots or programs disguising themselves as real users.

### Why would I want to identify good bots?
Recognising good bots such as web crawlers is useful for multiple purposes. Although it is not recommended to serve different content to web crawlers like Googlebot, you can still elect to
-   Flag pageviews to consider with **business analysis**.
-   Prefer to serve cached content and **relieve service load**.
-   Omit third party solutions' code (tags, pixels) and **reduce costs**.
> It is not recommended to whitelist requests for any reason based on user agent header only. Instead other methods of identification can be added such as [reverse dns lookup](https://www.npmjs.com/package/reverse-dns-lookup).

## Data sources

We use external data sources on top of our own lists to keep up to date

### Crawlers user agents:
-   [user-agents.net](https://user-agents.net/bots)
-   [crawler-user-agents repo](https://raw.githubusercontent.com/monperrus/crawler-user-agents/master/crawler-user-agents.json)
-   [myip.ms](https://www.myip.ms/files/bots/live_webcrawlers.txt)
-   [matomo.org](https://github.com/matomo-org/device-detector/blob/master/Tests/fixtures/bots.yml)
-   A Manual list

### Non bot user agents:
-   [user-agents npm package](https://www.npmjs.com/package/user-agents)
-   A Manual list

Missing something? Please [open an issue](https://github.com/omrilotan/isbot/issues/new/choose)

## Major releases breaking changes ([full changelog](./CHANGELOG.md))

### [**Version 3**](https://github.com/omrilotan/isbot/releases/tag/v3.0.0)
Remove testing for node 6 and 8

### [**Version 2**](https://github.com/omrilotan/isbot/releases/tag/v2.0.0)
Change return value for isbot: `true` instead of matched string

### [**Version 1**](https://github.com/omrilotan/isbot/releases/tag/v1.0.0)
No functional change

## Real world data

| Execution times in milliseconds
| -
| ![](https://user-images.githubusercontent.com/516342/125660283-c6ef9db8-6162-449b-912d-7b7ae97ef411.png)
