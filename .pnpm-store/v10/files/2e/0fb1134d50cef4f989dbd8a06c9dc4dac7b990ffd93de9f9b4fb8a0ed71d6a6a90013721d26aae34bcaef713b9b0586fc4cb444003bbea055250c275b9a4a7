'use strict';
var $ = require('../internals/export');
var global = require('../internals/global');
var schedulersFix = require('../internals/schedulers-fix');

var setInterval = schedulersFix(global.setInterval, true);

// Bun / IE9- setInterval additional parameters fix
// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-setinterval
$({ global: true, bind: true, forced: global.setInterval !== setInterval }, {
  setInterval: setInterval
});
