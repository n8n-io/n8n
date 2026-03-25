## Branch 3.x ##

### 3.12.0 ###

* Added: option to override bar characters via instance options on `multibar.create()` - thanks to [Araxeus on GitHub](https://github.com/npkgz/cli-progress/pull/136)
* Added: example howto use multibars with different bar styles
* Bugfix: global terminal instance was not used for multibar elements which forces hard string trimming to terminal width - caused by default `linewrap=true` state of the terminal - thanks to [emmercm on GitHub](https://github.com/npkgz/cli-progress/issues/135)

### 3.11.2 ###

* Bugfix: disabled `gracefulExit` by default, because the default SIGINT/SIGTERM handlers of nodejs are removed

### 3.11.1 ###

* Bugfix: `MaxListenersExceededWarning` was triggered by `gracefulExit` handlers added in `v3.11.0` - thanks to [TychoTheTaco on GitHub](https://github.com/npkgz/cli-progress/pull/125)

### 3.11.0 ###

* Added: `log()` convenience method the multibar to enable custom logging output on top of the progress bars during operation
* Added: `gracefulExit` option (enabled by default) to stop the bars in case of `SIGINT` or `SIGTERM` - this restores most cursor settings before exiting
* Added: `progressCalculationRelative` option (disabled by default) to use the `startValue` as offset for the progress calculation and calculate the absolute progress from the difference given by `total-startValue` #121
* Added: ability to pass bar options (overrides the global options) to `multibar.create`
* Bugfix: within a non-tty environment (e.g. CI/CD taskrunners) `multibar.create()` returns an undefined value in case `noTTYOutput` is not enabled #117

### 3.10.0 ###

* Changed: foreground color of `preset.shades-grey` is set directly by ANSI codes
* Changed: example snippets are using `ansi-colors` library
* Bugfix: removed `colors` dependency due to some issues with the maintainer... see [Zalgo bomb](https://github.com/Marak/colors.js/issues/285#issuecomment-1008212640)

### 3.9.1 ###

* Bugfix: duration calculation doesn't work for bar restart scenarios - thanks to [autlaw on GitHub](https://github.com/npkgz/cli-progress/pull/101)

### 3.9.0 ###

* Added: exported standard formatter and format helper
* Added: example howto use multibars in synchronous context
* Changed: upper eta display limit to `1e7` (115days) #92

### 3.8.2 ###

* Bugfix: bar duration not stopped until all bars have finished - thanks to [omjadas on GitHub](https://github.com/npkgz/cli-progress/issues/71)

### 3.8.1 ###

* Bugfix: percentage calculation used `Math.round` which caused incorrect values for edge cases - thanks to [OxCom on GitHub](https://github.com/npkgz/cli-progress/issues/70)

### 3.8.0 ###

* Changed: allow to pass payload as first argument to `increment()` with implicit delta of 1 - thanks to [ecdeveloper on GitHub](https://github.com/npkgz/cli-progress/pull/67)
* Changed: allow to pass payload as first argument to `update()` without updating bar value
* Bugfix: `formatTime` option ignored due to type - thanks to [omjadas on GitHub](https://github.com/npkgz/cli-progress/issues/68)

### 3.7.0 ###

* Added: asynchronous eta update for long running processes (optional) - feature [requested on GitHub](https://github.com/npkgz/cli-progress/issues/65)
* Added: method to trigger eta calculation without progress update

### 3.6.1 ###

* Bugfix: bar initialization overrides options within all instances - thanks to [BigBrainAFK on GitHub](https://github.com/npkgz/cli-progress/issues/64)

### 3.6.0 ###

* Added: support for custom time-format function
* Added: support for custom bar-format function
* Added: support for custom value-format function
* Added: auto-padding option to enforce fixed size of values - feature [requested on GitHub](https://github.com/npkgz/cli-progress/issues/60)
* Added: `barGlue` option to insert ascii escape sequences (e.g. for colorization) between the bar complete/incomplete elements - feature [requested on GitHub](https://github.com/npkgz/cli-progress/issues/53)
* Bugfix: `eta` value can be negative for multibars in case the bar is alredy completed

### 3.5.0 ###

* Added: support for events via [EventEmitter](https://nodejs.org/api/events.html) - feature [requested on GitHub](https://github.com/npkgz/cli-progress/pull/58)

### 3.4.0 ###

* Added: testsuites based on mocha - thanks to [on GitHub](https://github.com/npkgz/cli-progress/pull/49)
* Added: automatic tests via [Travis CI](https://travis-ci.org/)
* Bugfix: Fixing issues with falsy values in format which causes remdering artifacts - thanks to [on GitHub](https://github.com/npkgz/cli-progress/pull/49)
* Bugfix: documentation of the `stream` options was wrong - thanks to [ehmicky on GitHub](https://github.com/npkgz/cli-progress/pull/51)
* Changed: updated examples/syntax of `README.md` - thanks to [justsml on GitHub](https://github.com/npkgz/cli-progress/pull/50)

### 3.3.1 ###

* Bugifx: synchronous update may cause unexpected behaviour on multibars - limited to single bars
* Changed: renamed internal eta `push()` method to `update()`
* Changed: moved internal eta calculation call into `update()`

### 3.3.0 ###

* Added: option to pass custom formatters as callback via `options.format`
* Changed: replaced static placeholder code with generic regex (performance enhancement)

### 3.2.0 ###

* Added: `emptyOnZero` option to display total:0 bars as empty, not full - thanks to [nickcmaynard on GitHub](https://github.com/npkgz/cli-progress/pull/42)
* Bugfix: removed cursor save/restore calls for multibars - clearOnComplete might not work on all environments - thanks to [sayem314 onGitHub](https://github.com/npkgz/cli-progress/issues/40)

### 3.1.0 ###

* Added: notty support (interval/schedule based output) - feature requested [on GitHub](https://github.com/npkgz/cli-progress/issues/25)
* Added: `stopOnComplete` support within `MultiBar` - thanks to [Nox-404 on GitHub](https://github.com/npkgz/cli-progress/pull/35)
* Changed: initial throttel time of `MultiBar` is controlled by `fps` option instead of static `500ms` value
* Bugfix: provided option didn't take precedence over the preset as in v2 - thanks to [AxelTerizaki on GitHub](https://github.com/npkgz/cli-progress/issues/37) #37

### 3.0.0 ###

* Added: multi-progressbar support - feature requested [on GitHub](https://github.com/npkgz/cli-progress/issues/26)
* Added: option `synchronousUpdate` to control the synchronized redraw during `update()` call (default=`true`)
* Changed: project split into multiple classes
* Changed: default cli progress output is written to `stdout` instead of `stderr`

## Branch 2.x ##

### 2.1.1 ###

* Bugifx: preset object got altered by options - thanks to [rvalitov on GitHub](https://github.com/npkgz/cli-progress/issues/27) #27

### 2.1.0 ###

* Added: `align` option to change the position of the progress bar (left, center, right) - thanks to [sidneys on GitHub](https://github.com/npkgz/cli-progress/pull/22) #22
* Changed: ETA value of type `Infinity` is displayed as **INF**, `NaN` as **NULL** - feature requested by [AxelTerizaki on GitHub](https://github.com/npkgz/cli-progress/issues/21) #21
* Changed: Limited the maximum ETA value to `100000s` (**INF** is displayed in this case)
* Changed: ETA calculation moved to own scope
* Bugfix: example `example-notty.php` was broken

### 2.0.0 ###

Upgrade is possible without any code modifications! requires **node.js 4**

* Added: option `linewrap` to disable terminal line wrapping (default)
* Changed: requires **node.js >= 4**
* Changed: Native ES2015 class syntax
* Changed: renamed application entry file to `cli-progress.js`
* Changed: low-level terminal interactions are encapsulated within `Terminal` class
* Changed: terminal/cursor settings are restored after progress bar stopped
* Bugfix: used hex ascii escape sequences instaed of octals to avoid javascript errors in recent nodejs version
* Bugfix: disabled line wrapping by default to avoid multiple line breaks on small terminals (cut on the right) - reported by [puppeteer701 on GitHub](https://github.com/npkgz/cli-progress/issues/20) #20

## Branch 1.x ##

### 1.8.0 ###
* Added: method `setTotal()` to manipulate the total value within running progress-bar - feature requested by [ReggaePanda on GitHub](https://github.com/npkgz/cli-progress/issues/19) #19
* Changed: moved example file to `examples/` directory

### 1.7.0 ###
* Added: payload argument to `increment()` - feature requested by [dsego on GitHub](https://github.com/npkgz/cli-progress/issues/18) #18

### 1.6.1 ###
* Bugfix: `roundTo` parameter was not set for `elapsedTime` calculation which caused raw float values within formatted time strings - thanks to [rekinyz on GitHub](https://github.com/npkgz/cli-progress/pull/16) #16

### 1.6.0 ###
* Added: Additional payload data which can be used as **custom-tokens** within the bar - thanks to [tobiasps on GitHub](https://github.com/npkgz/cli-progress/pull/15) #15

### 1.5.1 ###
* Bugfix: Progressbar cannot be initialized to 0% - thanks to [erikkallen on GitHub](https://github.com/npkgz/cli-progress/pull/14) #13
* Bugfix: ETA was **NULL** in case the progress bar is initialized with (0/0)

### 1.5.0 ###
* Added: **0** values for total/progress initialization are allowed - feature requested by [jfmmm on GitHub](https://github.com/npkgz/cli-progress/issues/11) #11

### 1.4.0 ###
* Added: **Preset/Theme support**. Different bar-styles can be loaded from internal library (in addition to full customization)
* Added: Dependency **colors** for colorized progress bars 
* Added: Preset `legacy`
* Added: Preset `shades-classic`
* Added: Preset `shades-grey`
* Added: Preset `rect`

### 1.3.1 ###
* Added: `example-notty` to test the behaviour of progress bar in non-interactive environments (input streams closed)
* Bugfix: `update()` throws an error in **non-tty** environments - reported by [Ognian on GitHub](https://github.com/npkgz/cli-progress/issues/9) #9

### 1.3.0 ###
* Added: `stopOnComplete` option to automatically call `stop()` when the value reaches the total - thanks to [lennym on GitHub](https://github.com/lennym) #7

### 1.2.0 ###
* Added: `increment()` method to increase the current progress relatively - thanks to [lennym on GitHub](https://github.com/lennym) #6
* Added: ETA time formatting options (mm:ss, hh:mm, ss) - thanks to [lennym on GitHub](https://github.com/lennym) #5
* Improvement: More accurate ETA calculation using linear estimation of last N values - thanks to [lennym on GitHub](https://github.com/lennym) #4
* Bugfix: FPS calculation error which caused performance issues - thanks to [lennym on GitHub](https://github.com/lennym) #7

### 1.1.2 ###
* Bugfix: stdout.cursorTo/stdout.clearLine is not a function; replaced by `readline` - thanks to [remcoder on GitHub](https://github.com/npkgz/cli-progress/pull/2)

### 1.1.1 ###
* Bugfix: Hide cursor options was enabled by default

### 1.1.0 ###
* Added: Support for synchronous operations (interval has been replaced by timeout and throttle time) - feature requested [GitHub](https://github.com/npkgz/cli-progress/issues/1)
* Added: Synchronous Operation Example `example-synchronous.js`
* Added: Option to hide the cursor `options.hideCursor` - default set to false
* Changed: Improved ETA calculation

### 1.0.1 ###
* Bugfix: the bar-size is limited to `options.barsize` - in some (numerical) situations it can be too long (n+1)

### 1.0.0 ###
* Initial public release