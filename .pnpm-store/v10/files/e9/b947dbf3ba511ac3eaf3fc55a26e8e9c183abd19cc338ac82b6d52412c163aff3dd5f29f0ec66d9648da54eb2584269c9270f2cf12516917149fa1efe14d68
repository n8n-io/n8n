# char-spinner

Put a little spinner on process.stderr, as unobtrusively as possible.

## USAGE

```javascript
var spinner = require("char-spinner")

// All options are optional
// even the options argument itself is optional
spinner(options)
```

## OPTIONS

Usually the defaults are what you want.  Mostly they're just
configurable for testing purposes.

* `stream` Output stream.  Default=`process.stderr`
* `tty` Only show spinner if output stream has a truish `.isTTY`.  Default=`true`
* `string` String of chars to spin.  Default=`'/-\\|'`
* `interval` Number of ms between frames, bigger = slower.  Default=`50`
* `cleanup` Print `'\r \r'` to stream on process exit.  Default=`true`
* `unref` Unreference the spinner interval so that the process can
  exit normally.  Default=`true`
* `delay` Number of frames to "skip over" before printing the spinner.
  Useful if you want to avoid showing the spinner for very fast
  actions.  Default=`2`

Returns the generated interval, if one was created.
