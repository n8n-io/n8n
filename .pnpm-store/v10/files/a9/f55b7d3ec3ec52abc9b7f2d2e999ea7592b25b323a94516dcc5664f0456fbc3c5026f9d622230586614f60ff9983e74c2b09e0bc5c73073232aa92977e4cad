<p align="center">
  <a href="https://nodemon.io/"><img src="https://user-images.githubusercontent.com/13700/35731649-652807e8-080e-11e8-88fd-1b2f6d553b2d.png" alt="Nodemon Logo"></a>
</p>

# nodemon

nodemon is a tool that helps develop Node.js based applications by automatically restarting the node application when file changes in the directory are detected.

nodemon does **not** require *any* additional changes to your code or method of development. nodemon is a replacement wrapper for `node`. To use `nodemon`, replace the word `node` on the command line when executing your script.

[![NPM version](https://badge.fury.io/js/nodemon.svg)](https://npmjs.org/package/nodemon)
[![Backers on Open Collective](https://opencollective.com/nodemon/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/nodemon/sponsors/badge.svg)](#sponsors)

# Installation

Either through cloning with git or by using [npm](http://npmjs.org) (the recommended way):

```bash
npm install -g nodemon # or using yarn: yarn global add nodemon
```

And nodemon will be installed globally to your system path.

You can also install nodemon as a development dependency:

```bash
npm install --save-dev nodemon # or using yarn: yarn add nodemon -D
```

With a local installation, nodemon will not be available in your system path or you can't use it directly from the command line. Instead, the local installation of nodemon can be run by calling it from within an npm script (such as `npm start`) or using `npx nodemon`.

# Usage

nodemon wraps your application, so you can pass all the arguments you would normally pass to your app:

```bash
nodemon [your node app]
```

For CLI options, use the `-h` (or `--help`) argument:

```bash
nodemon -h
```

Using nodemon is simple, if my application accepted a host and port as the arguments, I would start it as so:

```bash
nodemon ./server.js localhost 8080
```

Any output from this script is prefixed with `[nodemon]`, otherwise all output from your application, errors included, will be echoed out as expected.

You can also pass the `inspect` flag to node through the command line as you would normally:

```bash
nodemon --inspect ./server.js 80
```

If you have a `package.json` file for your app, you can omit the main script entirely and nodemon will read the `package.json` for the `main` property and use that value as the app ([ref](https://github.com/remy/nodemon/issues/14)).

nodemon will also search for the `scripts.start` property in `package.json` (as of nodemon 1.1.x).

Also check out the [FAQ](https://github.com/remy/nodemon/blob/master/faq.md) or [issues](https://github.com/remy/nodemon/issues) for nodemon.

## Automatic re-running

nodemon was originally written to restart hanging processes such as web servers, but now supports apps that cleanly exit. If your script exits cleanly, nodemon will continue to monitor the directory (or directories) and restart the script if there are any changes.

## Manual restarting

Whilst nodemon is running, if you need to manually restart your application, instead of stopping and restart nodemon, you can type `rs` with a carriage return, and nodemon will restart your process.

## Config files

nodemon supports local and global configuration files. These are usually named `nodemon.json` and can be located in the current working directory or in your home directory. An alternative local configuration file can be specified with the `--config <file>` option.

The specificity is as follows, so that a command line argument will always override the config file settings:

- command line arguments
- local config
- global config

A config file can take any of the command line arguments as JSON key values, for example:

```json
{
  "verbose": true,
  "ignore": ["*.test.js", "**/fixtures/**"],
  "execMap": {
    "rb": "ruby",
    "pde": "processing --sketch={{pwd}} --run"
  }
}
```

The above `nodemon.json` file might be my global config so that I have support for ruby files and processing files, and I can run `nodemon demo.pde` and nodemon will automatically know how to run the script even though out of the box support for processing scripts.

A further example of options can be seen in [sample-nodemon.md](https://github.com/remy/nodemon/blob/master/doc/sample-nodemon.md)

### package.json

If you want to keep all your package configurations in one place, nodemon supports using `package.json` for configuration.
Specify the config in the same format as you would for a config file but under `nodemonConfig` in the `package.json` file, for example, take the following `package.json`:

```json
{
  "name": "nodemon",
  "homepage": "http://nodemon.io",
  "...": "... other standard package.json values",
  "nodemonConfig": {
    "ignore": ["**/test/**", "**/docs/**"],
    "delay": 2500
  }
}
```

Note that if you specify a `--config` file or provide a local `nodemon.json` any `package.json` config is ignored.

*This section needs better documentation, but for now you can also see `nodemon --help config` ([also here](https://github.com/remy/nodemon/blob/master/doc/cli/config.txt))*.

## Using nodemon as a module

Please see [doc/requireable.md](doc/requireable.md)

## Using nodemon as child process

Please see [doc/events.md](doc/events.md#Using_nodemon_as_child_process)

## Running non-node scripts

nodemon can also be used to execute and monitor other programs. nodemon will read the file extension of the script being run and monitor that extension instead of `.js` if there's no `nodemon.json`:

```bash
nodemon --exec "python -v" ./app.py
```

Now nodemon will run `app.py` with python in verbose mode (note that if you're not passing args to the exec program, you don't need the quotes), and look for new or modified files with the `.py` extension.

### Default executables

Using the `nodemon.json` config file, you can define your own default executables using the `execMap` property. This is particularly useful if you're working with a language that isn't supported by default by nodemon.

To add support for nodemon to know about the `.pl` extension (for Perl), the `nodemon.json` file would add:

```json
{
  "execMap": {
    "pl": "perl"
  }
}
```

Now running the following, nodemon will know to use `perl` as the executable:

```bash
nodemon script.pl
```

It's generally recommended to use the global `nodemon.json` to add your own `execMap` options. However, if there's a common default that's missing, this can be merged in to the project so that nodemon supports it by default, by changing [default.js](https://github.com/remy/nodemon/blob/master/lib/config/defaults.js) and sending a pull request.

## Monitoring multiple directories

By default nodemon monitors the current working directory. If you want to take control of that option, use the `--watch` option to add specific paths:

```bash
nodemon --watch app --watch libs app/server.js
```

Now nodemon will only restart if there are changes in the `./app` or `./libs` directory. By default nodemon will traverse sub-directories, so there's no need in explicitly including sub-directories.

Nodemon also supports unix globbing, e.g `--watch './lib/*'`. The globbing pattern must be quoted. For advanced globbing, [see `picomatch` documentation](https://github.com/micromatch/picomatch#advanced-globbing), the library that nodemon uses through `chokidar` (which in turn uses it through `anymatch`).

## Specifying extension watch list

By default, nodemon looks for files with the `.js`, `.mjs`, `.coffee`, `.litcoffee`, and `.json` extensions. If you use the `--exec` option and monitor `app.py` nodemon will monitor files with the extension of `.py`. However, you can specify your own list with the `-e` (or `--ext`) switch like so:

```bash
nodemon -e js,pug
```

Now nodemon will restart on any changes to files in the directory (or subdirectories) with the extensions `.js`, `.pug`.

## Ignoring files

By default, nodemon will only restart when a `.js` JavaScript file changes. In some cases you will want to ignore some specific files, directories or file patterns, to prevent nodemon from prematurely restarting your application.

This can be done via the command line:

```bash
nodemon --ignore lib/ --ignore tests/
```

Or specific files can be ignored:

```bash
nodemon --ignore lib/app.js
```

Patterns can also be ignored (but be sure to quote the arguments):

```bash
nodemon --ignore 'lib/*.js'
```

**Important** the ignore rules are patterns matched to the full absolute path, and this determines how many files are monitored. If using a wild card glob pattern, it needs to be used as `**` or omitted entirely. For example, `nodemon --ignore '**/test/**'` will work, whereas `--ignore '*/test/*'` will not.

Note that by default, nodemon will ignore the `.git`, `node_modules`, `bower_components`, `.nyc_output`, `coverage` and `.sass-cache` directories and *add* your ignored patterns to the list. If you want to indeed watch a directory like `node_modules`, you need to [override the underlying default ignore rules](https://github.com/remy/nodemon/blob/master/faq.md#overriding-the-underlying-default-ignore-rules).

## Application isn't restarting

In some networked environments (such as a container running nodemon reading across a mounted drive), you will need to use the `legacyWatch: true` which enables Chokidar's polling.

Via the CLI, use either `--legacy-watch` or `-L` for short:

```bash
nodemon -L
```

Though this should be a last resort as it will poll every file it can find.

## Delaying restarting

In some situations, you may want to wait until a number of files have changed. The timeout before checking for new file changes is 1 second. If you're uploading a number of files and it's taking some number of seconds, this could cause your app to restart multiple times unnecessarily.

To add an extra throttle, or delay restarting, use the `--delay` command:

```bash
nodemon --delay 10 server.js
```

For more precision, milliseconds can be specified.  Either as a float:

```bash
nodemon --delay 2.5 server.js
```

Or using the time specifier (ms):

```bash
nodemon --delay 2500ms server.js
```

The delay figure is number of seconds (or milliseconds, if specified) to delay before restarting. So nodemon will only restart your app the given number of seconds after the *last* file change.

If you are setting this value in `nodemon.json`, the value will always be interpreted in milliseconds. E.g., the following are equivalent:

```bash
nodemon --delay 2.5

{
  "delay": 2500
}
```

## Gracefully reloading down your script

It is possible to have nodemon send any signal that you specify to your application.

```bash
nodemon --signal SIGHUP server.js
```

Your application can handle the signal as follows.

```js
process.on("SIGHUP", function () {
  reloadSomeConfiguration();
  process.kill(process.pid, "SIGTERM");
})
```

Please note that nodemon will send this signal to every process in the process tree.

If you are using `cluster`, then each workers (as well as the master) will receive the signal. If you wish to terminate all workers on receiving a `SIGHUP`, a common pattern is to catch the `SIGHUP` in the master, and forward `SIGTERM` to all workers, while ensuring that all workers ignore `SIGHUP`.

```js
if (cluster.isMaster) {
  process.on("SIGHUP", function () {
    for (const worker of Object.values(cluster.workers)) {
      worker.process.kill("SIGTERM");
    }
  });
} else {
  process.on("SIGHUP", function() {})
}
```

## Controlling shutdown of your script

nodemon sends a kill signal to your application when it sees a file update. If you need to clean up on shutdown inside your script you can capture the kill signal and handle it yourself.

The following example will listen once for the `SIGUSR2` signal (used by nodemon to restart), run the clean up process and then kill itself for nodemon to continue control:

```js
// important to use `on` and not `once` as nodemon can re-send the kill signal
process.on('SIGUSR2', function () {
  gracefulShutdown(function () {
    process.kill(process.pid, 'SIGTERM');
  });
});
```

Note that the `process.kill` is *only* called once your shutdown jobs are complete. Hat tip to [Benjie Gillam](http://www.benjiegillam.com/2011/08/node-js-clean-restart-and-faster-development-with-nodemon/) for writing this technique up.

## Triggering events when nodemon state changes

If you want growl like notifications when nodemon restarts or to trigger an action when an event happens, then you can either `require` nodemon or add event actions to your `nodemon.json` file.

For example, to trigger a notification on a Mac when nodemon restarts, `nodemon.json` looks like this:

```json
{
  "events": {
    "restart": "osascript -e 'display notification \"app restarted\" with title \"nodemon\"'"
  }
}
```

A full list of available events is listed on the [event states wiki](https://github.com/remy/nodemon/wiki/Events#states). Note that you can bind to both states and messages.

## Pipe output to somewhere else

```js
nodemon({
  script: ...,
  stdout: false // important: this tells nodemon not to output to console
}).on('readable', function() { // the `readable` event indicates that data is ready to pick up
  this.stdout.pipe(fs.createWriteStream('output.txt'));
  this.stderr.pipe(fs.createWriteStream('err.txt'));
});
```

## Using nodemon in your gulp workflow

Check out the [gulp-nodemon](https://github.com/JacksonGariety/gulp-nodemon) plugin to integrate nodemon with the rest of your project's gulp workflow.

## Using nodemon in your Grunt workflow

Check out the [grunt-nodemon](https://github.com/ChrisWren/grunt-nodemon) plugin to integrate nodemon with the rest of your project's grunt workflow.

## Pronunciation

> nodemon, is it pronounced: node-mon, no-demon or node-e-mon (like pokémon)?

Well...I've been asked this many times before. I like that I've been asked this before. There's been bets as to which one it actually is.

The answer is simple, but possibly frustrating. I'm not saying (how I pronounce it). It's up to you to call it as you like. All answers are correct :)

## Design principles

- Fewer flags is better
- Works across all platforms
- Fewer features
- Let individuals build on top of nodemon
- Offer all CLI functionality as an API
- Contributions must have and pass tests

Nodemon is not perfect, and CLI arguments has sprawled beyond where I'm completely happy, but perhaps it can be reduced a little one day.

## FAQ

See the [FAQ](https://github.com/remy/nodemon/blob/master/faq.md) and please add your own questions if you think they would help others.

## Backers

Thank you to all [our backers](https://opencollective.com/nodemon#backer)! 🙏

[![nodemon backers](https://opencollective.com/nodemon/backers.svg?width=890)](https://opencollective.com/nodemon#backers)

## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [Sponsor this project today ❤️](https://opencollective.com/nodemon#sponsor)

<div style="overflow: hidden; margin-bottom: 80px;"><!--oc--><a title='Netpositive' data-id='162674' data-tier='1' href='https://najlepsibukmacherzy.pl/ranking-legalnych-bukmacherow/'><img alt='Netpositive' src='https://opencollective-production.s3.us-west-1.amazonaws.com/52acecf0-608a-11eb-b17f-5bca7c67fe7b.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Best online casinos not on GamStop in the UK' data-id='243140' data-tier='1' href='https://casino-wise.com/'><img alt='Best online casinos not on GamStop in the UK' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/f889d209-a931-4c06-a529-fe1f86c411bf/casino-wise-logo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='TheCasinoDB' data-id='270835' data-tier='1' href='https://www.thecasinodb.com'><img alt='TheCasinoDB' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/7fbc2acb-ba5c-4a5c-99d2-17e205e9a151/8a0f6204-f303-4129-a498-2263fd21e640.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Goread.io' data-id='320564' data-tier='1' href='https://goread.io/buy-instagram-followers'><img alt='Goread.io' src='https://opencollective-production.s3.us-west-1.amazonaws.com/7d1302a0-0f33-11ed-a094-3dca78aec7cd.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Best Australian online casinos. Reviewed by Correct Casinos.' data-id='322445' data-tier='1' href='https://www.correctcasinos.com/australian-online-casinos/'><img alt='Best Australian online casinos. Reviewed by Correct Casinos.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/fef95200-1551-11ed-ba3f-410c614877c8.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Website dedicated to finding the best and safest licensed online casinos in India' data-id='342390' data-tier='1' href='https://www.ghotala.com/'><img alt='Website dedicated to finding the best and safest licensed online casinos in India' src='https://opencollective-production.s3.us-west-1.amazonaws.com/75afa9e0-4ac6-11ed-8d6a-fdcc8c0d0736.jpg' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='nongamstopcasinos.net' data-id='367236' data-tier='1' href='https://www.pieria.co.uk/'><img alt='nongamstopcasinos.net' src='https://opencollective-production.s3.us-west-1.amazonaws.com/fb8b5ba0-3904-11ed-8516-edd7b7687a36.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Buy Instagram Likes' data-id='411448' data-tier='1' href='https://poprey.com/'><img alt='Buy Instagram Likes' src='https://opencollective-production.s3.us-west-1.amazonaws.com/fe650970-c21c-11ec-a499-b55e54a794b4.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='OnlineCasinosSpelen' data-id='423738' data-tier='1' href='https://onlinecasinosspelen.com'><img alt='OnlineCasinosSpelen' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/47e87426-6a55-4f69-9fb5-4e5032dc35a8/5d10dd22-320e-47d4-84e6-d144874f1f5f.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Beoordelen van nieuwe online casino&apos;s 2023' data-id='424449' data-tier='1' href='https://Nieuwe-Casinos.net'><img alt='Beoordelen van nieuwe online casino&apos;s 2023' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/b803f279-c2a2-42da-8f05-d23e73cb8b26/aba64d6d-97e8-468c-b598-db08e0a134c5.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='CasinoZonderRegistratie.net - Nederlandse Top Casino&apos;s' data-id='424450' data-tier='1' href='https://casinozonderregistratie.net/'><img alt='CasinoZonderRegistratie.net - Nederlandse Top Casino&apos;s' src='https://opencollective-production.s3.us-west-1.amazonaws.com/aeb624c0-7ae7-11ed-8d0e-bda59436695a.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Buy real Instagram followers from Twicsy starting at only $2.97. Twicsy has been voted the best site to buy followers from the likes of US Magazine.' data-id='453050' data-tier='1' href='https://twicsy.com/buy-instagram-followers'><img alt='Buy real Instagram followers from Twicsy starting at only $2.97. Twicsy has been voted the best site to buy followers from the likes of US Magazine.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/f07b6f83-d0ed-43c6-91ae-ec8fa90512cd/twicsy-followers.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='SocialWick offers the best Instagram Followers in the market. If you are looking to boost your organic growth, buy Instagram followers from SocialWick' data-id='462750' data-tier='1' href='https://www.socialwick.com/instagram/followers'><img alt='SocialWick offers the best Instagram Followers in the market. If you are looking to boost your organic growth, buy Instagram followers from SocialWick' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/4a977a23-f63a-489a-891b-c0eb8cab1cb4/icon.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Buy Telegram Members' data-id='501897' data-tier='1' href='https://buycheapestfollowers.com/buy-telegram-channel-members'><img alt='Buy Telegram Members' src='https://github-production-user-asset-6210df.s3.amazonaws.com/13700/286696172-747dca05-a1e8-4d93-a9e9-95054d1566df.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='We review the entire iGaming industry from A to Z' data-id='504258' data-tier='1' href='https://casinolandia.com'><img alt='We review the entire iGaming industry from A to Z' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/5f858add-77f1-47a2-b577-39eecb299c8c/Logo264.jpg' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='CryptoCasinos.online' data-id='525119' data-tier='1' href='https://cryptocasinos.online/'><img alt='CryptoCasinos.online' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/97712948-3b1b-4026-a109-257d879baa23/CryptoCasinos.Online-FBcover18.jpg' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='No deposit casino promo Codes 2024 - The best online Casinos websites. No deposit bonus codes, Free Spins and Promo Codes. Stake, Roobet, Jackpotcity and more.' data-id='540890' data-tier='1' href='https://www.ownedcore.com/casino'><img alt='No deposit casino promo Codes 2024 - The best online Casinos websites. No deposit bonus codes, Free Spins and Promo Codes. Stake, Roobet, Jackpotcity and more.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/8bd4b78c-95e2-4c41-b4f4-d7fd6c0e12cd/logo4-e6140c27.webp' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Online casino.' data-id='541128' data-tier='1' href='https://www.fruityking.co.nz'><img alt='Online casino.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/7cde3c6f-052c-41bb-93f0-8be187682791/10e42029-c513-4edd-ac24-a8e41d697a96.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Boost your social media presence effortlessly with top-quality Instagram and TikTok followers and likes.' data-id='579911' data-tier='1' href='https://leofame.com/buy-instagram-followers'><img alt='Boost your social media presence effortlessly with top-quality Instagram and TikTok followers and likes.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/186c0e19-b195-4228-901a-ab1b70d63ee5/WhatsApp%20Image%202024-06-21%20at%203.50.43%20AM.jpg' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Social Media Management and all kinds of followers' data-id='587050' data-tier='1' href='https://www.socialfollowers.uk/buy-tiktok-followers/'><img alt='Social Media Management and all kinds of followers' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/8941f043-5d00-4e33-a1fd-f2d27ca54963/Social%20Followers%20Uk%20logo%20black.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Betwinner is an online bookmaker offering sports betting, casino games, and more.' data-id='594768' data-tier='1' href='https://guidebook.betwinner.com/'><img alt='Betwinner is an online bookmaker offering sports betting, casino games, and more.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/82cab29a-7002-4924-83bf-2eecb03d07c4/0x0.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='At Buzzoid, you can buy Instagram followers quickly, safely, and easily with just a few clicks. Rated world&apos;s #1 IG service since 2012.' data-id='602382' data-tier='1' href='https://buzzoid.com/buy-instagram-followers/'><img alt='At Buzzoid, you can buy Instagram followers quickly, safely, and easily with just a few clicks. Rated world&apos;s #1 IG service since 2012.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/f77464f7-0457-451a-b29d-8e3b161ce83f/285fbc9f-6461-4393-8942-da62d1bed968.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Zamsino.com' data-id='608094' data-tier='1' href='https://zamsino.com/'><img alt='Zamsino.com' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/e3e99af5-a024-4d85-8594-8fd22e506bc9/Zamsino.com%20Logo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Reviewing and comparing online casinos available to Finnish players. In addition, we publish relevant news and blog posts about the world of iGaming.' data-id='620398' data-tier='1' href='https://uusimmatkasinot.com/'><img alt='Reviewing and comparing online casinos available to Finnish players. In addition, we publish relevant news and blog posts about the world of iGaming.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/d5326d0f-3cde-41f4-b480-78ef8a2fb015/Uusimmatkasinot_head_siteicon.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Buzzvoice is your one-stop shop for all your social media marketing needs. With Buzzvoice, you can buy followers, comments, likes, video views and more!' data-id='646075' data-tier='1' href='https://buzzvoice.com/'><img alt='Buzzvoice is your one-stop shop for all your social media marketing needs. With Buzzvoice, you can buy followers, comments, likes, video views and more!' src='https://opencollective-production.s3.us-west-1.amazonaws.com/acd68da0-e71e-11ec-a84e-fd82f80383c1.jpg' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='' data-id='648524' data-tier='1' href='https://www.c19.cl/'><img alt='' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/01b96d4c-4852-4499-8c70-e3ec57d0c58c/2024-05-09_17-27%20(1).png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='SocialBoosting: Buy Instagram &amp; TikTok Followers, Likes, Views' data-id='653711' data-tier='1' href='https://www.socialboosting.com/'><img alt='SocialBoosting: Buy Instagram &amp; TikTok Followers, Likes, Views' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/80a54dfd-8952-4851-8cab-dcfa4a8a0a87/favicon.gif' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Ігрові автомати онлайн' data-id='655295' data-tier='1' href='https://casino.ua/casino/slots/'><img alt='Ігрові автомати онлайн' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/3c8fa725-e203-4c57-933c-0a884527fd5b/images.jpg' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Kasinohai.com' data-id='673849' data-tier='1' href='https://www.kasinohai.com/nettikasinot'><img alt='Kasinohai.com' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/ad75f68f-cb97-46f8-8981-bbe81ad6ffc9/51bafb1d-ed66-482f-8a8e-9b7b07d55f96.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Casino Online Chile' data-id='678929' data-tier='1' href='https://www.acee.cl/'><img alt='Casino Online Chile' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/292c66d6-0c5c-40e8-96f0-900dcdeaaf47/acee-casino-chile.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='casino online chile' data-id='709152' data-tier='1' href='https://chilecasinoonline.cl/'><img alt='casino online chile' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/7f3780b2-b7a7-47aa-9837-c01099585495/casino-online-chile-logo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Vanguard Media évalue les casinos en ligne pour joueurs français, testant les sites en France. Nos classements stricts garantissent des casinos fiables et sûrs.' data-id='723517' data-tier='1' href='https://www.vanguardngr.com/casino/fr/'><img alt='Vanguard Media évalue les casinos en ligne pour joueurs français, testant les sites en France. Nos classements stricts garantissent des casinos fiables et sûrs.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/38065879-ef15-4e67-80a1-bdbb30ecb485/101895f1-ca10-49e3-a297-23a915fb9524.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Bei Releaf erhalten Sie schnell und diskret Ihr Cannabis Rezept online. Unsere Ärzte prüfen Ihre Angaben und stellen bei Eignung das Rezept aus. Anschließend können Sie legal und sicher medizinisches Cannabis über unsere Partnerapotheken kaufen.' data-id='727109' data-tier='1' href='https://releaf.com/de'><img alt='Bei Releaf erhalten Sie schnell und diskret Ihr Cannabis Rezept online. Unsere Ärzte prüfen Ihre Angaben und stellen bei Eignung das Rezept aus. Anschließend können Sie legal und sicher medizinisches Cannabis über unsere Partnerapotheken kaufen.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/b686d646-5029-4b4c-8cab-9645ab2679de/9da596d1-f48a-41ec-947d-a64dd8e7529c.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Analysis of online casinos with the best payouts' data-id='728673' data-tier='1' href='https://payidpokies.bet/'><img alt='Analysis of online casinos with the best payouts' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/854e333b-14ac-48da-9bab-b108deee06ba/payid-pokies-logo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Download multithreaded HEIC to JPG converter software for Windows 10/11' data-id='751387' data-tier='1' href='https://www.softorbits.net/convert-heic-to-jpeg/'><img alt='Download multithreaded HEIC to JPG converter software for Windows 10/11' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/34c7f097-4c59-4be6-a59c-55af13b0bd10/logo-final-square512.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='We specialize in the online gambling industry, helping players access reliable and verified information about the best online casinos and pokies in Australia. Our team tests casinos and games, collects user reviews from Trustpilot, and organizes them in o' data-id='753333' data-tier='1' href='https://au.trustpilot.com/review/bestpayidpokies.net'><img alt='We specialize in the online gambling industry, helping players access reliable and verified information about the best online casinos and pokies in Australia. Our team tests casinos and games, collects user reviews from Trustpilot, and organizes them in o' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/985a0ae7-54c3-4680-8816-bc8d656f7562/payidpokies.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Wolf Winner Casino' data-id='754359' data-tier='1' href='https://www.wolfwinner.fun/en'><img alt='Wolf Winner Casino' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/556e09fb-d232-4c99-9644-9d28e1cfe27b/wolf-winner-casino-logo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='AUCrazyVegas' data-id='756605' data-tier='1' href='https://au.crazyvegas.com/'><img alt='AUCrazyVegas' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/be59e9fa-a83d-4244-9e74-f54b7f454e14/au.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='iDealeCasinos' data-id='757116' data-tier='1' href='https://idealecasinos.com/'><img alt='iDealeCasinos' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/907841d3-435e-44b4-9684-c33fd8635ece/ideale-casinos-square-white-logo-300.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='' data-id='757154' data-tier='1' href='https://nl.trustpilot.com/review/buitenlandsecasino.vip'><img alt='' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/9465308a-8e44-4606-af5d-5a81a3c6567b/ChatGPT%20Image%20Nov%2015%2C%202025%2C%2002_53_25%20PM.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='BetPokies.co.nz is your New Zealand guide in the world of online gambling. Our site was created by gamblers for gamblers.' data-id='760968' data-tier='1' href='https://nz.trustpilot.com/review/betpokies.co.nz'><img alt='BetPokies.co.nz is your New Zealand guide in the world of online gambling. Our site was created by gamblers for gamblers.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/117c78d0-973e-11ed-b663-5b4207ae3c06.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='one x bet - Arabic betting site' data-id='765806' data-tier='1' href='https://xn----ymcbek6cvgvaq.com/'><img alt='one x bet - Arabic betting site' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/529647a4-6230-4013-bcc5-b5855158c022/ChatGPT%20Image%20Sep%2030%2C%202025%2C%2001_29_18%20PM.jpg' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Online Casino Zonder Registratie' data-id='766416' data-tier='1' href='https://nl.trustpilot.com/review/zonderregistratiecasinos.com'><img alt='Online Casino Zonder Registratie' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/cf382ddc-627b-4bd9-8870-43ee28d2a628/casino-zonder-registratie.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='We test dozens of casinos every month and select the coolest ones for Australian players. ' data-id='767300' data-tier='1' href='https://au.trustpilot.com/review/payid-casino.net'><img alt='We test dozens of casinos every month and select the coolest ones for Australian players. ' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/ecd8a5f4-fd86-4903-a512-cbfaff35e7ef/payidpokiessites.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Buy Instagram Followers' data-id='771428' data-tier='1' href='https://www.reddit.com/r/MarketingMentor/comments/1cut7x5/where_to_buy_instagram_followers_likes/'><img alt='Buy Instagram Followers' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/706dc1c9-2c24-4403-ac55-0b498364dc86/BOOST_LOGO_OUTLINE_CMKY_REG_WHITE_on-green-background_MAR19-scaled.webp' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Pokies Reviews' data-id='771618' data-tier='1' href='https://au.trustpilot.com/review/pokiesgambler.com'><img alt='Pokies Reviews' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/a04c9ed0-b1d5-4dbe-a5fd-4cec00567916/pokiesgambler.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Buy TikTok Comments' data-id='772992' data-tier='1' href='https://buylikesservices.com/buy-tiktok-custom-comments/'><img alt='Buy TikTok Comments' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/1125514e-fc5e-4e1f-a186-a478fa7c3189/6bf0e4e1-f6aa-4d00-a141-f5b2c2642d65.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Mi misión es la educación y transparencia en el mundo de los casinos online' data-id='780847' data-tier='1' href='https://www.educatransparencia.cl/'><img alt='Mi misión es la educación y transparencia en el mundo de los casinos online' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/c034fdcb-1d17-4c83-8105-f3cfa4f874d6/educalogocito.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Spreading knowledge about $ETH' data-id='783771' data-tier='1' href='https://theethereum.wiki'><img alt='Spreading knowledge about $ETH' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/bfce6f44-affd-4acd-94c2-bf33797f1cb2/Screenshot%202026-01-28%20at%2014.19.23.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='' data-id='783792' data-tier='1' href='https://time.now/'><img alt='' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/4cca6170-acb2-4b1a-b85b-7715416237cf/time-now-logo3.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Best online sports betting and casino company.' data-id='784673' data-tier='1' href='https://global.fun88.com/'><img alt='Best online sports betting and casino company.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/1688ebca-4984-4b9b-a24d-8fdd1233892f/fun88-logo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='bestecasinozondercruks' data-id='785087' data-tier='1' href='https://nl.trustpilot.com/review/bestecasinozondercruks.online'><img alt='bestecasinozondercruks' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/4948eca9-abd5-49ea-bb70-1ea6053f8663/ChatGPT%20Image%20Dec%2027%2C%202025%2C%2010_22_47%20PM-min.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Best online sports betting company in Thailand.' data-id='787477' data-tier='1' href='https://www.fun88thh.com/th/'><img alt='Best online sports betting company in Thailand.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/bbf7174c-fc01-4ce6-86b5-f621e350969d/fun88-logo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Best online sports betting company in Vietnam.' data-id='787478' data-tier='1' href='https://www.fun88vnu.com/vn/'><img alt='Best online sports betting company in Vietnam.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/ed704e1d-3894-48bb-83e3-6094b2c68a5c/fun88-logo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='We testen elke maand tientallen casino’s en kiezen de beste uit voor Nederlandse spelers.' data-id='787870' data-tier='1' href='https://nl.trustpilot.com/review/scandicasinos.com'><img alt='We testen elke maand tientallen casino’s en kiezen de beste uit voor Nederlandse spelers.' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/115ec975-5575-436a-9406-9ef439dd28c0/scandicasinos.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='ThePokies Net' data-id='787930' data-tier='1' href='https://au.trustpilot.com/review/thepokies-au.com'><img alt='ThePokies Net' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/7981d14b-e79a-45a6-91b5-6040b0077e28/pokiesnet-casino.jpg' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Aviator Game Online' data-id='789860' data-tier='1' href='https://www.trustpilot.com/review/aviatorplay.top'><img alt='Aviator Game Online' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/b3cf9a31-607e-4d3f-8b86-0726f4323dae/aviatorr.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a>
<a title='Plinko Game' data-id='789874' data-tier='1' href='https://www.trustpilot.com/review/plinkoplay.top'><img alt='Plinko Game' src='https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/5e953df9-1876-45b6-9ffc-f2009804935b/plinkoo.png' style='object-fit: contain; float: left; margin:12px' height='120' width='120'></a><!--oc-->
</div>

Please note that links to the sponsors above are not direct endorsements nor affiliated with any of contributors of the nodemon project.

# License

MIT [http://rem.mit-license.org](http://rem.mit-license.org)
