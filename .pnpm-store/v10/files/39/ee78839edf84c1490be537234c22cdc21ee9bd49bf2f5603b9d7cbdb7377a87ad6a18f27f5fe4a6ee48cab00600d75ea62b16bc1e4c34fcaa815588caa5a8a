
class DebounceTimers{
  constructor(cb , defaultDelay){
    this.cb = cb;
    this.delay = defaultDelay;
    this.timers = {

    };
    this.pausers = {};
  }
  setDelay(delay){
    if ( delay >= 0)
      this.delay = delay;
  }
  pause(key){
    this.pausers[key] = this.pausers[key]|| 0;
    this.pausers[key]++;
  }
  unpause(key){
    var count = this.pausers[key] || 0;
    if (count>0)
    count--;
    this.pausers[key] = count;
  }
  unpauseAndTime(key){
    this.unpause(key);
    this.time(key);
  }
  time(key){
    var self = this;
    var timers = this.timers;
    var timer = this.timers[key];
    if (this.pausers[key] > 0)
      return;
    if (timer)
      clearTimeout(timer);

    timers[key] = setTimeout(function onTimer(){
      self.cb(key);
      delete timers[key];
    } , self.delay)
  }
}
class ERR_INVALID_ARG_TYPE extends TypeError{
    constructor(name, expected, actual){
      const type = name.includes('.') ? 'property' : 'argument';
      let msg = `The "${name}" ${type} ${determiner} ${expected}`;
      
    }
  }
  function assertIsObject(value, name, types = 'Object') {
    if (value !== undefined &&
        (value === null ||
         typeof value !== 'object' ||
         Array.isArray(value))) {
      const err = new ERR_INVALID_ARG_TYPE(name, types, value);
      Error.captureStackTrace(err, assertIsObject);
      throw err;
    }
  }


  module.exports = {
    ERR_INVALID_ARG_TYPE,
    assertIsObject,
    DebounceTimers
  }