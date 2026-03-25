# getos

[![Greenkeeper badge](https://badges.greenkeeper.io/retrohacker/getos.svg)](https://greenkeeper.io/)

![getos](./imgs/logo.png)

[![Build Status](https://travis-ci.org/retrohacker/getos.png?branch=master)](https://travis-ci.org/retrohacker/getos) ![](https://img.shields.io/github/issues/retrohacker/getos.svg) ![](https://img.shields.io/npm/dm/getos.svg) ![](https://img.shields.io/npm/v/getos.svg) ![](https://img.shields.io/npm/l/getos.svg)  ![](https://img.shields.io/twitter/url/https/github.com/retrohacker/getos.svg?style=social)

[![NPM](https://nodei.co/npm/getos.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/getos/)[![NPM](https://nodei.co/npm-dl/getos.png?months=9&height=3)](https://nodei.co/npm/getos/)

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)


Get the OS/Distribution name of the environment you are working on

## Problem

`os.platform()` returns `linux`. If you want the distrubtion name, you're out of luck.

## Solution

This. Simply call:

```js
var getos = require('getos')

getos(function(e,os) {
  if(e) return console.log(e)
  console.log("Your OS is:" +JSON.stringify(os))
})
```

The `os` object conforms to:

```js
{
  os: [OS NAME],
  dist:[DIST NAME],
  codename:[CODENAME],
  release:[VERSION]
}
```

For example:

```js
{
  os: "linux",
  dist: "Ubuntu",
  codename: "precise",
  release: "12.04"
}
```

## Disclaimer
Check `os.json` in this repo. Any distribution that *shares* a common resource file with another distrubtion is currently untested. These are the arrays of distrubitons with more than 1 member. If you are using one of these distrubtions, please submit an issue letting me know if it works. If it fails, please post the content of the file.

If you have a distrubtion *not* in `os.json`, please identify your resource file and submit it's name and content along with your distrbution/version in an issue.

Thanks for helping make this tool great.

## Unit Tests

Unit tests stub out the behaviour of the OS files and libraries we depend on to ensure the behaviour of the application is sound. You can run these simply by running `npm test`

## Authors and Contributors

getos has been made possible by these fantastic contributors:

<table><tbody>
<tr><th align="left">Benjamin E. Coe</th><td><a href="https://github.com/bcoe">GitHub/bcoe</a></td><td><a href="http://twitter.com/benjamincoe">Twitter/@benjamincoe</a></td></tr>
<tr><th align="left">Eugene Sharygin</th><td><a href="https://github.com/eush77">GitHub/eush77</a></td><td><a href="http://twitter.com/eush77">Twitter/@eush77</a></td></tr>
<tr><th align="left">David Routhieau</th><td><a href="https://github.com/root-io">GitHub/root-io</a></td><td>unknown</td></tr>
<tr><th align="left">Lawrence</th><td><a href="https://github.com/mindmelting">GitHub/mindmelting</a></td><td><a href="http://twitter.com/mindmelting">Twitter/@mindmelting</a></td></tr>
<tr><th align="left">Roman Jurkov</th><td><a href="https://github.com/winfinit">GitHub/winfinit</a></td><td><a href="http://twitter.com/winfinit">Twitter/@winfinit</a></td></tr>
<tr><th align="left">Rod Vagg</th><td><a href="https://github.com/rvagg">GitHub/rvagg</a></td><td><a href="http://twitter.com/rvagg">Twitter/@rvagg</a></td></tr>
<tr><th align="left">Zeke Sikelianos</th><td><a href="https://github.com/zeke">GitHub/zeke</a></td><td><a href="http://twitter.com/zeke">Twitter/@zeke</a></td></tr>
<tr><th align="left">Alexander</th><td><a href="https://github.com/alex4Zero">GitHub/alex4Zero</a></td><td><a href="http://twitter.com/alex4Zero">Twitter/@alex4Zero</a></td></tr>
</tbody></table>
