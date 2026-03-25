"use strict";
var Event = require('./Event');
var MouseEvent = require('./MouseEvent');
var utils = require('./utils');

module.exports = EventTarget;

function EventTarget() {}

EventTarget.prototype = {
  // XXX
  // See WebIDL §4.8 for details on object event handlers
  // and how they should behave.  We actually have to accept
  // any object to addEventListener... Can't type check it.
  // on registration.

  // XXX:
  // Capturing event listeners are sort of rare.  I think I can optimize
  // them so that dispatchEvent can skip the capturing phase (or much of
  // it).  Each time a capturing listener is added, increment a flag on
  // the target node and each of its ancestors.  Decrement when removed.
  // And update the counter when nodes are added and removed from the
  // tree as well.  Then, in dispatch event, the capturing phase can
  // abort if it sees any node with a zero count.
  addEventListener: function addEventListener(type, listener, capture) {
    if (!listener) return;
    if (capture === undefined) capture = false;
    if (!this._listeners) this._listeners = Object.create(null);
    if (!this._listeners[type]) this._listeners[type] = [];
    var list = this._listeners[type];

    // If this listener has already been registered, just return
    for(var i = 0, n = list.length; i < n; i++) {
      var l = list[i];
      if (l.listener === listener && l.capture === capture)
        return;
    }

    // Add an object to the list of listeners
    var obj = { listener: listener, capture: capture };
    if (typeof listener === 'function') obj.f = listener;
    list.push(obj);
  },

  removeEventListener: function removeEventListener(type,
                            listener,
                            capture) {
    if (capture === undefined) capture = false;
    if (this._listeners) {
      var list = this._listeners[type];
      if (list) {
        // Find the listener in the list and remove it
        for(var i = 0, n = list.length; i < n; i++) {
          var l = list[i];
          if (l.listener === listener && l.capture === capture) {
            if (list.length === 1) {
              this._listeners[type] = undefined;
            }
            else {
              list.splice(i, 1);
            }
            return;
          }
        }
      }
    }
  },

  // This is the public API for dispatching untrusted public events.
  // See _dispatchEvent for the implementation
  dispatchEvent: function dispatchEvent(event) {
    // Dispatch an untrusted event
    return this._dispatchEvent(event, false);
  },

  //
  // See DOMCore §4.4
  // XXX: I'll probably need another version of this method for
  // internal use, one that does not set isTrusted to false.
  // XXX: see Document._dispatchEvent: perhaps that and this could
  // call a common internal function with different settings of
  // a trusted boolean argument
  //
  // XXX:
  // The spec has changed in how to deal with handlers registered
  // on idl or content attributes rather than with addEventListener.
  // Used to say that they always ran first.  That's how webkit does it
  // Spec now says that they run in a position determined by
  // when they were first set.  FF does it that way.  See:
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#event-handlers
  //
  _dispatchEvent: function _dispatchEvent(event, trusted) {
    if (typeof trusted !== 'boolean') trusted = false;
    function invoke(target, event) {
      var type = event.type, phase = event.eventPhase;
      event.currentTarget = target;

      // If there was an individual handler defined, invoke it first
      // XXX: see comment above: this shouldn't always be first.
      if (phase !== Event.CAPTURING_PHASE &&
        target._handlers && target._handlers[type])
      {
        var handler = target._handlers[type];
        var rv;
        if (typeof handler === 'function') {
          rv=handler.call(event.currentTarget, event);
        }
        else {
          var f = handler.handleEvent;
          if (typeof f !== 'function')
            throw new TypeError('handleEvent property of ' +
                                'event handler object is' +
                                'not a function.');
          rv=f.call(handler, event);
        }

        switch(event.type) {
        case 'mouseover':
          if (rv === true)  // Historical baggage
            event.preventDefault();
          break;
        case 'beforeunload':
          // XXX: eventually we need a special case here
          /* falls through */
        default:
          if (rv === false)
            event.preventDefault();
          break;
        }
      }

      // Now invoke list list of listeners for this target and type
      var list = target._listeners && target._listeners[type];
      if (!list) return;
      list = list.slice();
      for(var i = 0, n = list.length; i < n; i++) {
        if (event._immediatePropagationStopped) return;
        var l = list[i];
        if ((phase === Event.CAPTURING_PHASE && !l.capture) ||
          (phase === Event.BUBBLING_PHASE && l.capture))
          continue;
        if (l.f) {
          l.f.call(event.currentTarget, event);
        }
        else {
          var fn = l.listener.handleEvent;
          if (typeof fn !== 'function')
            throw new TypeError('handleEvent property of event listener object is not a function.');
          fn.call(l.listener, event);
        }
      }
    }

    if (!event._initialized || event._dispatching) utils.InvalidStateError();
    event.isTrusted = trusted;

    // Begin dispatching the event now
    event._dispatching = true;
    event.target = this;

    // Build the list of targets for the capturing and bubbling phases
    // XXX: we'll eventually have to add Window to this list.
    var ancestors = [];
    for(var n = this.parentNode; n; n = n.parentNode)
      ancestors.push(n);

    // Capturing phase
    event.eventPhase = Event.CAPTURING_PHASE;
    for(var i = ancestors.length-1; i >= 0; i--) {
      invoke(ancestors[i], event);
      if (event._propagationStopped) break;
    }

    // At target phase
    if (!event._propagationStopped) {
      event.eventPhase = Event.AT_TARGET;
      invoke(this, event);
    }

    // Bubbling phase
    if (event.bubbles && !event._propagationStopped) {
      event.eventPhase = Event.BUBBLING_PHASE;
      for(var ii = 0, nn = ancestors.length; ii < nn; ii++) {
        invoke(ancestors[ii], event);
        if (event._propagationStopped) break;
      }
    }

    event._dispatching = false;
    event.eventPhase = Event.AT_TARGET;
    event.currentTarget = null;

    // Deal with mouse events and figure out when
    // a click has happened
    if (trusted && !event.defaultPrevented && event instanceof MouseEvent) {
      switch(event.type) {
      case 'mousedown':
        this._armed = {
          x: event.clientX,
          y: event.clientY,
          t: event.timeStamp
        };
        break;
      case 'mouseout':
      case 'mouseover':
        this._armed = null;
        break;
      case 'mouseup':
        if (this._isClick(event)) this._doClick(event);
        this._armed = null;
        break;
      }
    }



    return !event.defaultPrevented;
  },

  // Determine whether a click occurred
  // XXX We don't support double clicks for now
  _isClick: function(event) {
    return (this._armed !== null &&
        event.type === 'mouseup' &&
        event.isTrusted &&
        event.button === 0 &&
        event.timeStamp - this._armed.t < 1000 &&
        Math.abs(event.clientX - this._armed.x) < 10 &&
        Math.abs(event.clientY - this._armed.Y) < 10);
  },

  // Clicks are handled like this:
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/elements.html#interactive-content-0
  //
  // Note that this method is similar to the HTMLElement.click() method
  // The event argument must be the trusted mouseup event
  _doClick: function(event) {
    if (this._click_in_progress) return;
    this._click_in_progress = true;

    // Find the nearest enclosing element that is activatable
    // An element is activatable if it has a
    // _post_click_activation_steps hook
    var activated = this;
    while(activated && !activated._post_click_activation_steps)
      activated = activated.parentNode;

    if (activated && activated._pre_click_activation_steps) {
      activated._pre_click_activation_steps();
    }

    var click = this.ownerDocument.createEvent('MouseEvent');
    click.initMouseEvent('click', true, true,
      this.ownerDocument.defaultView, 1,
      event.screenX, event.screenY,
      event.clientX, event.clientY,
      event.ctrlKey, event.altKey,
      event.shiftKey, event.metaKey,
      event.button, null);

    var result = this._dispatchEvent(click, true);

    if (activated) {
      if (result) {
        // This is where hyperlinks get followed, for example.
        if (activated._post_click_activation_steps)
          activated._post_click_activation_steps(click);
      }
      else {
        if (activated._cancelled_activation_steps)
          activated._cancelled_activation_steps();
      }
    }
  },

  //
  // An event handler is like an event listener, but it registered
  // by setting an IDL or content attribute like onload or onclick.
  // There can only be one of these at a time for any event type.
  // This is an internal method for the attribute accessors and
  // content attribute handlers that need to register events handlers.
  // The type argument is the same as in addEventListener().
  // The handler argument is the same as listeners in addEventListener:
  // it can be a function or an object. Pass null to remove any existing
  // handler.  Handlers are always invoked before any listeners of
  // the same type.  They are not invoked during the capturing phase
  // of event dispatch.
  //
  _setEventHandler: function _setEventHandler(type, handler) {
    if (!this._handlers) this._handlers = Object.create(null);
    this._handlers[type] = handler;
  },

  _getEventHandler: function _getEventHandler(type) {
    return (this._handlers && this._handlers[type]) || null;
  }

};
