const Ops = require('./../lib/extensions/ops')

class Session {
  constructor () {
    this.ops = new Ops()
    this.opsStatus = this.ops.status()
  }

  //
  // opsOff/On
  //
  opsOn () {
    return this.opsStatus === 'on'
  }

  opsOff () {
    return !this.opsOn()
  }
}

module.exports = Session
