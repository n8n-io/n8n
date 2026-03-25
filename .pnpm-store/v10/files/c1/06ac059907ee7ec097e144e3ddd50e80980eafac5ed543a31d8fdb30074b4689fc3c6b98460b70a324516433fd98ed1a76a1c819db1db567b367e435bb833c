//
//
//

// Heartbeats. In AMQP both clients and servers may expect a heartbeat
// frame if there is no activity on the connection for a negotiated
// period of time. If there's no activity for two such intervals, the
// server or client is allowed to close the connection on the
// presumption that the other party is dead.
//
// The client has two jobs here: the first is to send a heartbeat
// frame if it's not sent any frames for a while, so that the server
// doesn't think it's dead; the second is to check periodically that
// it's seen activity from the server, and to advise if there doesn't
// appear to have been any for over two intervals.
//
// Node.JS timers are a bit unreliable, in that they endeavour only to
// fire at some indeterminate point *after* the given time (rather
// gives the lie to 'realtime', dunnit). Because the scheduler is just
// an event loop, it's quite easy to delay timers indefinitely by
// reacting to some I/O with a lot of computation.
//
// To mitigate this I need a bit of creative interpretation:
//
//  - I'll schedule a server activity check for every `interval`, and
//    check just how much time has passed. It will overshoot by at
//    least a small margin; modulo missing timer deadlines, it'll
//    notice between two and three intervals after activity actually
//    stops (otherwise, at some point after two intervals).
//
//  - Every `interval / 2` I'll check that we've sent something since
//    the last check, and if not, send a heartbeat frame. If we're
//    really too busy to even run the check for two whole heartbeat
//    intervals, there must be a lot of I (but not O, at least not on
//    the connection), or computation, in which case perhaps it's best
//    the server cuts us off anyway. Why `interval / 2`? Because the
//    edge case is that the client sent a frame just after a
//    heartbeat, which would mean I only send one after almost two
//    intervals. (NB a heartbeat counts as a send, so it'll be checked
//    at least twice before sending another)
//
// This design is based largely on RabbitMQ's heartbeating:
// https://github.com/rabbitmq/rabbitmq-common/blob/master/src/rabbit_heartbeat.erl

// %% Yes, I could apply the same 'actually passage of time' thing to
// %% send as well as to recv.

'use strict';

var EventEmitter = require('events');

// Exported so that we can mess with it in tests
module.exports.UNITS_TO_MS = 1000;

class Heart extends EventEmitter {
  constructor (interval, checkSend, checkRecv) {
    super();

    this.interval = interval;

    var intervalMs = interval * module.exports.UNITS_TO_MS;
    // Function#bind is my new best friend
    var beat = this.emit.bind(this, 'beat');
    var timeout = this.emit.bind(this, 'timeout');

    this.sendTimer = setInterval(
      this.runHeartbeat.bind(this, checkSend, beat), intervalMs / 2);

    // A timeout occurs if I see nothing for *two consecutive* intervals
    var recvMissed = 0;
    function missedTwo () {
      if (!checkRecv())
        return (++recvMissed < 2);
      else { recvMissed = 0; return true; }
    }
    this.recvTimer = setInterval(
      this.runHeartbeat.bind(this, missedTwo, timeout), intervalMs);
  }

  clear () {
    clearInterval(this.sendTimer);
    clearInterval(this.recvTimer);
  }

  runHeartbeat (check, fail) {
    // Have we seen activity?
    if (!check())
      fail();
  }
}

module.exports.Heart = Heart;
