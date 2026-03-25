let messages = [];
let level = 0;

const debug = (msg, min) => {
  if (level >= min) {
    messages.push(msg);
  }
};

debug.WARN = 1;
debug.INFO = 2;
debug.DEBUG = 3;

debug.reset = () => {
  messages = [];
};

debug.setDebugLevel = (v) => {
  level = v;
};

debug.warn = (msg) => debug(msg, debug.WARN);
debug.info = (msg) => debug(msg, debug.INFO);
debug.debug = (msg) => debug(msg, debug.DEBUG);

debug.debugMessages = () => messages;

module.exports = debug;
