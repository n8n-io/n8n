{
  "name": "event-stream",
  "version": "3.3.4",
  "description": "construct pipes of streams of events",
  "homepage": "http://github.com/dominictarr/event-stream",
  "repository": {
    "type": "git",
    "url": "git://github.com/dominictarr/event-stream.git"
  },
  "dependencies": {
    "through": "~2.3.1",
    "duplexer": "~0.1.1",
    "from": "~0",
    "map-stream": "~0.1.0",
    "pause-stream": "0.0.11",
    "split": "0.3",
    "stream-combiner": "~0.0.4"
  },
  "devDependencies": {
    "asynct": "*",
    "it-is": "1",
    "ubelt": "~3.2.2",
    "stream-spec": "~0.3.5",
    "tape": "~2.3.0"
  },
  "scripts": {
    "prepublish": "npm ls && npm test",
    "test": "asynct test/",
    "test_tap": "set -e; for t in test/*.js; do node $t; done"
  },
  "testling": {
    "files": "test/*.js",
    "browsers": {
      "ie": [
        8,
        9
      ],
      "firefox": [
        13
      ],
      "chrome": [
        20
      ],
      "safari": [
        5.1
      ],
      "opera": [
        12
      ]
    }
  },
  "license": "MIT",
  "author": "Dominic Tarr <dominic.tarr@gmail.com> (http://bit.ly/dominictarr)"
}
