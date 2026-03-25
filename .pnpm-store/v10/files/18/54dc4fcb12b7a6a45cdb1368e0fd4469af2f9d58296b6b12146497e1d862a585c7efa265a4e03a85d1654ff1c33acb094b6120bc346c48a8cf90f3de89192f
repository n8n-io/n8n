'use strict';

require('../utils/dataTransfer/Clipboard.js');
var getWindow = require('../utils/misc/getWindow.js');
var eventMap = require('./eventMap.js');

const eventInitializer = {
    ClipboardEvent: [
        initClipboardEvent
    ],
    Event: [],
    FocusEvent: [
        initUIEvent,
        initFocusEvent
    ],
    InputEvent: [
        initUIEvent,
        initInputEvent
    ],
    MouseEvent: [
        initUIEvent,
        initUIEventModifiers,
        initMouseEvent
    ],
    PointerEvent: [
        initUIEvent,
        initUIEventModifiers,
        initMouseEvent,
        initPointerEvent
    ],
    KeyboardEvent: [
        initUIEvent,
        initUIEventModifiers,
        initKeyboardEvent
    ]
};
function createEvent(type, target, init) {
    const window = getWindow.getWindow(target);
    const { EventType, defaultInit } = eventMap.eventMap[type];
    const event = new (getEventConstructors(window))[EventType](type, defaultInit);
    eventInitializer[EventType].forEach((f)=>f(event, init !== null && init !== undefined ? init : {}));
    return event;
}
/* istanbul ignore next */ function getEventConstructors(window) {
    var _window_Event;
    /* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-extraneous-class */ const Event = (_window_Event = window.Event) !== null && _window_Event !== undefined ? _window_Event : class Event {
    };
    var _window_AnimationEvent;
    const AnimationEvent = (_window_AnimationEvent = window.AnimationEvent) !== null && _window_AnimationEvent !== undefined ? _window_AnimationEvent : class AnimationEvent extends Event {
    };
    var _window_ClipboardEvent;
    const ClipboardEvent = (_window_ClipboardEvent = window.ClipboardEvent) !== null && _window_ClipboardEvent !== undefined ? _window_ClipboardEvent : class ClipboardEvent extends Event {
    };
    var _window_PopStateEvent;
    const PopStateEvent = (_window_PopStateEvent = window.PopStateEvent) !== null && _window_PopStateEvent !== undefined ? _window_PopStateEvent : class PopStateEvent extends Event {
    };
    var _window_ProgressEvent;
    const ProgressEvent = (_window_ProgressEvent = window.ProgressEvent) !== null && _window_ProgressEvent !== undefined ? _window_ProgressEvent : class ProgressEvent extends Event {
    };
    var _window_TransitionEvent;
    const TransitionEvent = (_window_TransitionEvent = window.TransitionEvent) !== null && _window_TransitionEvent !== undefined ? _window_TransitionEvent : class TransitionEvent extends Event {
    };
    var _window_UIEvent;
    const UIEvent = (_window_UIEvent = window.UIEvent) !== null && _window_UIEvent !== undefined ? _window_UIEvent : class UIEvent extends Event {
    };
    var _window_CompositionEvent;
    const CompositionEvent = (_window_CompositionEvent = window.CompositionEvent) !== null && _window_CompositionEvent !== undefined ? _window_CompositionEvent : class CompositionEvent extends UIEvent {
    };
    var _window_FocusEvent;
    const FocusEvent = (_window_FocusEvent = window.FocusEvent) !== null && _window_FocusEvent !== undefined ? _window_FocusEvent : class FocusEvent extends UIEvent {
    };
    var _window_InputEvent;
    const InputEvent = (_window_InputEvent = window.InputEvent) !== null && _window_InputEvent !== undefined ? _window_InputEvent : class InputEvent extends UIEvent {
    };
    var _window_KeyboardEvent;
    const KeyboardEvent = (_window_KeyboardEvent = window.KeyboardEvent) !== null && _window_KeyboardEvent !== undefined ? _window_KeyboardEvent : class KeyboardEvent extends UIEvent {
    };
    var _window_MouseEvent;
    const MouseEvent = (_window_MouseEvent = window.MouseEvent) !== null && _window_MouseEvent !== undefined ? _window_MouseEvent : class MouseEvent extends UIEvent {
    };
    var _window_DragEvent;
    const DragEvent = (_window_DragEvent = window.DragEvent) !== null && _window_DragEvent !== undefined ? _window_DragEvent : class DragEvent extends MouseEvent {
    };
    var _window_PointerEvent;
    const PointerEvent = (_window_PointerEvent = window.PointerEvent) !== null && _window_PointerEvent !== undefined ? _window_PointerEvent : class PointerEvent extends MouseEvent {
    };
    var _window_TouchEvent;
    const TouchEvent = (_window_TouchEvent = window.TouchEvent) !== null && _window_TouchEvent !== undefined ? _window_TouchEvent : class TouchEvent extends UIEvent {
    };
    /* eslint-enable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-extraneous-class */ return {
        Event,
        AnimationEvent,
        ClipboardEvent,
        PopStateEvent,
        ProgressEvent,
        TransitionEvent,
        UIEvent,
        CompositionEvent,
        FocusEvent,
        InputEvent,
        KeyboardEvent,
        MouseEvent,
        DragEvent,
        PointerEvent,
        TouchEvent
    };
}
function assignProps(obj, props) {
    for (const [key, value] of Object.entries(props)){
        Object.defineProperty(obj, key, {
            get: ()=>value !== null && value !== undefined ? value : null
        });
    }
}
function sanitizeNumber(n) {
    return Number(n !== null && n !== undefined ? n : 0);
}
function initClipboardEvent(event, { clipboardData }) {
    assignProps(event, {
        clipboardData
    });
}
function initFocusEvent(event, { relatedTarget }) {
    assignProps(event, {
        relatedTarget
    });
}
function initInputEvent(event, { data, inputType, isComposing }) {
    assignProps(event, {
        data,
        isComposing: Boolean(isComposing),
        inputType: String(inputType)
    });
}
function initUIEvent(event, { view, detail }) {
    assignProps(event, {
        view,
        detail: sanitizeNumber(detail !== null && detail !== undefined ? detail : 0)
    });
}
function initUIEventModifiers(event, { altKey, ctrlKey, metaKey, shiftKey, modifierAltGraph, modifierCapsLock, modifierFn, modifierFnLock, modifierNumLock, modifierScrollLock, modifierSymbol, modifierSymbolLock }) {
    assignProps(event, {
        altKey: Boolean(altKey),
        ctrlKey: Boolean(ctrlKey),
        metaKey: Boolean(metaKey),
        shiftKey: Boolean(shiftKey),
        getModifierState (k) {
            return Boolean({
                Alt: altKey,
                AltGraph: modifierAltGraph,
                CapsLock: modifierCapsLock,
                Control: ctrlKey,
                Fn: modifierFn,
                FnLock: modifierFnLock,
                Meta: metaKey,
                NumLock: modifierNumLock,
                ScrollLock: modifierScrollLock,
                Shift: shiftKey,
                Symbol: modifierSymbol,
                SymbolLock: modifierSymbolLock
            }[k]);
        }
    });
}
function initKeyboardEvent(event, { key, code, location, repeat, isComposing, charCode }) {
    assignProps(event, {
        key: String(key),
        code: String(code),
        location: sanitizeNumber(location),
        repeat: Boolean(repeat),
        isComposing: Boolean(isComposing),
        charCode
    });
}
function initMouseEvent(event, { x, y, screenX, screenY, clientX = x, clientY = y, button, buttons, relatedTarget, offsetX, offsetY, pageX, pageY }) {
    assignProps(event, {
        screenX: sanitizeNumber(screenX),
        screenY: sanitizeNumber(screenY),
        clientX: sanitizeNumber(clientX),
        x: sanitizeNumber(clientX),
        clientY: sanitizeNumber(clientY),
        y: sanitizeNumber(clientY),
        button: sanitizeNumber(button),
        buttons: sanitizeNumber(buttons),
        relatedTarget,
        offsetX: sanitizeNumber(offsetX),
        offsetY: sanitizeNumber(offsetY),
        pageX: sanitizeNumber(pageX),
        pageY: sanitizeNumber(pageY)
    });
}
function initPointerEvent(event, { pointerId, width, height, pressure, tangentialPressure, tiltX, tiltY, twist, pointerType, isPrimary }) {
    assignProps(event, {
        pointerId: sanitizeNumber(pointerId),
        width: sanitizeNumber(width !== null && width !== undefined ? width : 1),
        height: sanitizeNumber(height !== null && height !== undefined ? height : 1),
        pressure: sanitizeNumber(pressure),
        tangentialPressure: sanitizeNumber(tangentialPressure),
        tiltX: sanitizeNumber(tiltX),
        tiltY: sanitizeNumber(tiltY),
        twist: sanitizeNumber(twist),
        pointerType: String(pointerType),
        isPrimary: Boolean(isPrimary)
    });
}

exports.createEvent = createEvent;
