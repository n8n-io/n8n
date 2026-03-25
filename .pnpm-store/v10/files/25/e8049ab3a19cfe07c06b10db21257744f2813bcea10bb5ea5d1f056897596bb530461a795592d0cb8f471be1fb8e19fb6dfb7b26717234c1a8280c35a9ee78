export type EventInterface = 'AnimationEvent' | 'AudioProcessingEvent' | 'BeforeInputEvent' | 'BeforeUnloadEvent' | 'BlobEvent' | 'CSSFontFaceLoadEvent' | 'ClipboardEvent' | 'CloseEvent' | 'CompositionEvent' | 'CustomEvent' | 'DOMTransactionEvent' | 'DeviceLightEvent' | 'DeviceMotionEvent' | 'DeviceOrientationEvent' | 'DeviceProximityEvent' | 'DragEvent' | 'EditingBeforeInputEvent' | 'ErrorEvent' | 'Event' | 'FetchEvent' | 'FocusEvent' | 'GamepadEvent' | 'HashChangeEvent' | 'IDBVersionChangeEvent' | 'InputEvent' | 'KeyboardEvent' | 'MediaStreamEvent' | 'MessageEvent' | 'MouseEvent' | 'MutationEvent' | 'OfflineAudioCompletionEvent' | 'OverconstrainedError' | 'PageTransitionEvent' | 'PaymentRequestUpdateEvent' | 'PointerEvent' | 'PopStateEvent' | 'ProgressEvent' | 'RTCDataChannelEvent' | 'RTCIdentityErrorEvent' | 'RTCIdentityEvent' | 'RTCPeerConnectionIceEvent' | 'RelatedEvent' | 'SVGEvent' | 'SVGZoomEvent' | 'SensorEvent' | 'StorageEvent' | 'TimeEvent' | 'TouchEvent' | 'TrackEvent' | 'TransitionEvent' | 'UIEvent' | 'UserProximityEvent' | 'WebGLContextEvent' | 'WheelEvent';
export interface DomEvent {
    eventInterface: EventInterface | string;
    bubbles: boolean;
    cancelable: boolean;
}
export type DomEventName = keyof typeof domEvents;
export declare const ignorableKeyModifiers: string[];
export declare const systemKeyModifiers: readonly ["ctrl", "shift", "alt", "meta"];
export declare const mouseKeyModifiers: readonly ["left", "middle", "right"];
export declare const keyCodesByKeyName: {
    readonly backspace: 8;
    readonly tab: 9;
    readonly enter: 13;
    readonly esc: 27;
    readonly space: 32;
    readonly pageup: 33;
    readonly pagedown: 34;
    readonly end: 35;
    readonly home: 36;
    readonly left: 37;
    readonly up: 38;
    readonly right: 39;
    readonly down: 40;
    readonly insert: 45;
    readonly delete: 46;
};
export type KeyName = keyof typeof keyCodesByKeyName;
export type Modifier = (typeof systemKeyModifiers)[number] | (typeof mouseKeyModifiers)[number];
export type DomEventNameWithModifier = DomEventName | `${DomEventName}.${(typeof systemKeyModifiers)[number]}` | `click.${(typeof mouseKeyModifiers)[number]}` | `click.${(typeof systemKeyModifiers)[number]}.${(typeof mouseKeyModifiers)[number]}` | `${'keydown' | 'keyup'}.${keyof typeof keyCodesByKeyName}` | `${'keydown' | 'keyup'}.${(typeof systemKeyModifiers)[number]}.${keyof typeof keyCodesByKeyName}`;
declare const domEvents: {
    readonly abort: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly afterprint: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly animationend: {
        readonly eventInterface: "AnimationEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly animationiteration: {
        readonly eventInterface: "AnimationEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly animationstart: {
        readonly eventInterface: "AnimationEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly appinstalled: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    /**
     * @deprecated
     */
    readonly audioprocess: {
        readonly eventInterface: "AudioProcessingEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly audioend: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly audiostart: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly beforeprint: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly beforeunload: {
        readonly eventInterface: "BeforeUnloadEvent";
        readonly bubbles: false;
        readonly cancelable: true;
    };
    readonly beginEvent: {
        readonly eventInterface: "TimeEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly blur: {
        readonly eventInterface: "FocusEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly boundary: {
        readonly eventInterface: "SpeechSynthesisEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly cached: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly canplay: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly canplaythrough: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly change: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly chargingchange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly chargingtimechange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly checking: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly click: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly close: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly complete: {
        readonly eventInterface: "OfflineAudioCompletionEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly compositionend: {
        readonly eventInterface: "CompositionEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly compositionstart: {
        readonly eventInterface: "CompositionEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly compositionupdate: {
        readonly eventInterface: "CompositionEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly contextmenu: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly copy: {
        readonly eventInterface: "ClipboardEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly cut: {
        readonly eventInterface: "ClipboardEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly dblclick: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly devicechange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly devicelight: {
        readonly eventInterface: "DeviceLightEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly devicemotion: {
        readonly eventInterface: "DeviceMotionEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly deviceorientation: {
        readonly eventInterface: "DeviceOrientationEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly deviceproximity: {
        readonly eventInterface: "DeviceProximityEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly dischargingtimechange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly DOMActivate: {
        readonly eventInterface: "UIEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMAttributeNameChanged: {
        readonly eventInterface: "MutationNameEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMAttrModified: {
        readonly eventInterface: "MutationEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMCharacterDataModified: {
        readonly eventInterface: "MutationEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMContentLoaded: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMElementNameChanged: {
        readonly eventInterface: "MutationNameEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMFocusIn: {
        readonly eventInterface: "FocusEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMFocusOut: {
        readonly eventInterface: "FocusEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMNodeInserted: {
        readonly eventInterface: "MutationEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMNodeInsertedIntoDocument: {
        readonly eventInterface: "MutationEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMNodeRemoved: {
        readonly eventInterface: "MutationEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly DOMNodeRemovedFromDocument: {
        readonly eventInterface: "MutationEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    /**
     * @deprecated
     */
    readonly DOMSubtreeModified: {
        readonly eventInterface: "MutationEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly downloading: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly drag: {
        readonly eventInterface: "DragEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly dragend: {
        readonly eventInterface: "DragEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly dragenter: {
        readonly eventInterface: "DragEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly dragleave: {
        readonly eventInterface: "DragEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly dragover: {
        readonly eventInterface: "DragEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly dragstart: {
        readonly eventInterface: "DragEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly drop: {
        readonly eventInterface: "DragEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly durationchange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly emptied: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly end: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly ended: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly endEvent: {
        readonly eventInterface: "TimeEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly error: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly focus: {
        readonly eventInterface: "FocusEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly focusin: {
        readonly eventInterface: "FocusEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly focusout: {
        readonly eventInterface: "FocusEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly fullscreenchange: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly fullscreenerror: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly gamepadconnected: {
        readonly eventInterface: "GamepadEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly gamepaddisconnected: {
        readonly eventInterface: "GamepadEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly gotpointercapture: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly hashchange: {
        readonly eventInterface: "HashChangeEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly lostpointercapture: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly input: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly invalid: {
        readonly eventInterface: "Event";
        readonly cancelable: true;
        readonly bubbles: false;
    };
    readonly keydown: {
        readonly eventInterface: "KeyboardEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly keypress: {
        readonly eventInterface: "KeyboardEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly keyup: {
        readonly eventInterface: "KeyboardEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly languagechange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly levelchange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly load: {
        readonly eventInterface: "UIEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly loadeddata: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly loadedmetadata: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly loadend: {
        readonly eventInterface: "ProgressEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly loadstart: {
        readonly eventInterface: "ProgressEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly mark: {
        readonly eventInterface: "SpeechSynthesisEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly message: {
        readonly eventInterface: "MessageEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly messageerror: {
        readonly eventInterface: "MessageEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly mousedown: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly mouseenter: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly mouseleave: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly mousemove: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly mouseout: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly mouseover: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly mouseup: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly nomatch: {
        readonly eventInterface: "SpeechRecognitionEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly notificationclick: {
        readonly eventInterface: "NotificationEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly noupdate: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly obsolete: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly offline: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly online: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly open: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly orientationchange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly pagehide: {
        readonly eventInterface: "PageTransitionEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly pageshow: {
        readonly eventInterface: "PageTransitionEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly paste: {
        readonly eventInterface: "ClipboardEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly pause: {
        readonly eventInterface: "SpeechSynthesisEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly pointercancel: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly pointerdown: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly pointerenter: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly pointerleave: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly pointerlockchange: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly pointerlockerror: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly pointermove: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly pointerout: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly pointerover: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly pointerup: {
        readonly eventInterface: "PointerEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly play: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly playing: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly popstate: {
        readonly eventInterface: "PopStateEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly progress: {
        readonly eventInterface: "ProgressEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly push: {
        readonly eventInterface: "PushEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly pushsubscriptionchange: {
        readonly eventInterface: "PushEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly ratechange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly readystatechange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly repeatEvent: {
        readonly eventInterface: "TimeEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly reset: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly resize: {
        readonly eventInterface: "UIEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly resourcetimingbufferfull: {
        readonly eventInterface: "Performance";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly result: {
        readonly eventInterface: "SpeechRecognitionEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly resume: {
        readonly eventInterface: "SpeechSynthesisEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly scroll: {
        readonly eventInterface: "UIEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly seeked: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly seeking: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly select: {
        readonly eventInterface: "UIEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly selectstart: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly selectionchange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly show: {
        readonly eventInterface: "MouseEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly slotchange: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly soundend: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly soundstart: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly speechend: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly speechstart: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly stalled: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly start: {
        readonly eventInterface: "SpeechSynthesisEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly storage: {
        readonly eventInterface: "StorageEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly submit: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly success: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly suspend: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly SVGAbort: {
        readonly eventInterface: "SVGEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly SVGError: {
        readonly eventInterface: "SVGEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly SVGLoad: {
        readonly eventInterface: "SVGEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly SVGResize: {
        readonly eventInterface: "SVGEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly SVGScroll: {
        readonly eventInterface: "SVGEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly SVGUnload: {
        readonly eventInterface: "SVGEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly SVGZoom: {
        readonly eventInterface: "SVGZoomEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly timeout: {
        readonly eventInterface: "ProgressEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly timeupdate: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly touchcancel: {
        readonly eventInterface: "TouchEvent";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly touchend: {
        readonly eventInterface: "TouchEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly touchmove: {
        readonly eventInterface: "TouchEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly touchstart: {
        readonly eventInterface: "TouchEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly transitionend: {
        readonly eventInterface: "TransitionEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
    readonly unload: {
        readonly eventInterface: "UIEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly updateready: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly userproximity: {
        readonly eventInterface: "UserProximityEvent";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly voiceschanged: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly visibilitychange: {
        readonly eventInterface: "Event";
        readonly bubbles: true;
        readonly cancelable: false;
    };
    readonly volumechange: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly waiting: {
        readonly eventInterface: "Event";
        readonly bubbles: false;
        readonly cancelable: false;
    };
    readonly wheel: {
        readonly eventInterface: "WheelEvent";
        readonly bubbles: true;
        readonly cancelable: true;
    };
};
declare const _default: Record<"abort" | "afterprint" | "animationend" | "animationiteration" | "animationstart" | "appinstalled" | "audioprocess" | "audioend" | "audiostart" | "beforeprint" | "beforeunload" | "beginEvent" | "blur" | "boundary" | "cached" | "canplay" | "canplaythrough" | "change" | "chargingchange" | "chargingtimechange" | "checking" | "click" | "close" | "complete" | "compositionend" | "compositionstart" | "compositionupdate" | "contextmenu" | "copy" | "cut" | "dblclick" | "devicechange" | "devicelight" | "devicemotion" | "deviceorientation" | "deviceproximity" | "dischargingtimechange" | "DOMActivate" | "DOMAttributeNameChanged" | "DOMAttrModified" | "DOMCharacterDataModified" | "DOMContentLoaded" | "DOMElementNameChanged" | "DOMFocusIn" | "DOMFocusOut" | "DOMNodeInserted" | "DOMNodeInsertedIntoDocument" | "DOMNodeRemoved" | "DOMNodeRemovedFromDocument" | "DOMSubtreeModified" | "downloading" | "drag" | "dragend" | "dragenter" | "dragleave" | "dragover" | "dragstart" | "drop" | "durationchange" | "emptied" | "end" | "ended" | "endEvent" | "error" | "focus" | "focusin" | "focusout" | "fullscreenchange" | "fullscreenerror" | "gamepadconnected" | "gamepaddisconnected" | "gotpointercapture" | "hashchange" | "lostpointercapture" | "input" | "invalid" | "keydown" | "keypress" | "keyup" | "languagechange" | "levelchange" | "load" | "loadeddata" | "loadedmetadata" | "loadend" | "loadstart" | "mark" | "message" | "messageerror" | "mousedown" | "mouseenter" | "mouseleave" | "mousemove" | "mouseout" | "mouseover" | "mouseup" | "nomatch" | "notificationclick" | "noupdate" | "obsolete" | "offline" | "online" | "open" | "orientationchange" | "pagehide" | "pageshow" | "paste" | "pause" | "pointercancel" | "pointerdown" | "pointerenter" | "pointerleave" | "pointerlockchange" | "pointerlockerror" | "pointermove" | "pointerout" | "pointerover" | "pointerup" | "play" | "playing" | "popstate" | "progress" | "push" | "pushsubscriptionchange" | "ratechange" | "readystatechange" | "repeatEvent" | "reset" | "resize" | "resourcetimingbufferfull" | "result" | "resume" | "scroll" | "seeked" | "seeking" | "select" | "selectstart" | "selectionchange" | "show" | "slotchange" | "soundend" | "soundstart" | "speechend" | "speechstart" | "stalled" | "start" | "storage" | "submit" | "success" | "suspend" | "SVGAbort" | "SVGError" | "SVGLoad" | "SVGResize" | "SVGScroll" | "SVGUnload" | "SVGZoom" | "timeout" | "timeupdate" | "touchcancel" | "touchend" | "touchmove" | "touchstart" | "transitionend" | "unload" | "updateready" | "userproximity" | "voiceschanged" | "visibilitychange" | "volumechange" | "waiting" | "wheel", DomEvent>;
export default _default;
