# vue3-touch-events [![](https://img.shields.io/npm/v/vue3-touch-events.svg)](https://www.npmjs.com/package/vue3-touch-events)

**Enable tap, swipe, touch, hold, mouse down, mouse up events on any HTML DOM Element in vue.js 3.x.**

The easiest way to make your interactive vue.js content mobile-friendly. When you add `v-touch` events to your elements, it works on desktop and mobile using a fully declarative syntax. Unlike other libraries, you do not need to add any special code to your components to make this work. You simply have to register the library globally and it enables new events throughout your application.

### Note: Press the play button to the right of the image!

![Events](https://github.com/robinrodricks/vue3-touch-events/raw/master/images/animation.gif)

Released under the permissive MIT License.

Features:

- Declarative syntax for common touch events, such as `tap`, `swipe`, `hold`, `drag` and [more](#Events)
- All events support desktop (mouse) and mobile devices (touch screen) with the same syntax
- Automatically add styling on hover and tap using `v-touch-class` directive
- Bind multiple touch events on one DOM element
- Customizable events with native-like events handler
- Throttling for `drag` and `rollover` events to prevent crashing your application
- Global configuration that applies to all events in the application
- Ability to override global configuration on any element using `v-touch-options` directive
- Bindings for TypeScript included and also works in pure-JavaScript projects

Version:

> Note: This library is for **vue.js 3.x** only. For **vue.js 2.x** see the [older library](https://github.com/jerrybendy/vue-touch-events).

Credits:

- All credits go to Jerry Bendy for creating the original project [vue2-touch-events](https://github.com/jerrybendy/vue-touch-events)
- Special thanks to Xavier Julien for creating the [Vue 3.x port](https://github.com/XjulI1/vue-touch-events/tree/migrate-to-vuejs-3)




## Installation

To install with npm:

```shell
npm install vue3-touch-events
```

To install with yarn:

```shell
yarn add vue3-touch-events
```

### TypeScript

You need to register this plugin with vue.js in your main application file:

```js
import Vue from "vue";
import Vue3TouchEvents from "vue3-touch-events";

Vue.use(Vue3TouchEvents);
```

### JavaScript

You need to include the [UMD script](https://raw.githubusercontent.com/robinrodricks/vue3-touch-events/master/index.js) of this plugin and you do not need to register this plugin with vue.js.

```html
<script src="libs/vue.js"></script>
<script src="libs/vue3-touch-events.js"></script>
```



## Examples

In your `.vue` component files, use the `v-touch` directive add touch events to elements.

Specify the event using the first argument, for example `v-touch:tap` or `v-touch:swipe`.

```html
<!-- bind a tap event -->
<span v-touch:tap="touchHandler">Tap Me</span>

<!-- tap is the default event, you can omit it -->
<span v-touch="touchHandler">Tap Me</span>

<!-- bind the swipe event, no matter direction -->
<span v-touch:swipe="swipeHandler">Swipe Here</span>

<!-- only when swipe left can trigger the callback -->
<span v-touch:swipe.left="swipeHandler">Swipe Left Here</span>

<!-- bind a long tap event -->
<span v-touch:longtap="longtapHandler">Long Tap Event</span>

<!-- bind a start and end event -->
<span v-touch:press="startHandler" v-touch:release="endHandler">Press and Release Events</span>

<!-- bind a move and moving event -->
<span v-touch:drag.once="movedHandler">Triggered once when starting to move and tapTolerance is exceeded</span>
<span v-touch:drag="movingHandler">Continuously triggered while dragging</span>

<!-- touch and hold -->
<span v-touch:hold="touchHoldHandler">Touch and hold on the screen for a while</span>

<!-- you can even mix multiple events -->
<span v-touch:tap="tapHandler" v-touch:longtap="longtapHandler" v-touch:swipe.left="swipeLeftHandler" v-touch:press="startHandler" v-touch:release="endHandler" v-touch:swipe.right="swipeRightHandler">Mix Multiple Events</span>

<!-- using different options for specified element -->
<span v-touch:tap="tapHandler" v-touch-options="{touchClass: 'active', swipeTolerance: 80, touchHoldTolerance: 300}">Different options</span>

<!-- customize touch effects by CSS class -->
<span v-touch:tap="tapHandler" v-touch-class="active">Customize touch class</span>
<!-- or -->
<span v-touch:tap="tapHandler" v-touch-options="{touchClass: 'active'}">Customize touch class</span>
```



## Usage

### Simple callback

If you simply want to execute a callback function on a `v-touch` event, use this pattern:

```html
<div v-touch:tap="onTapItem">Button</div>
```

```js
methods: {
	onTapItem(mouseEvent) { // you can remove the `mouseEvent` argument
		console.log("Tapped!");
	},
},
```

### Passing parameters to the event handler

If you want to add extra parameters to your `v-touch` event handler, you need to return a delegate in the event handler. You can pass as many attributes as you need.

```html
<div v-for="(item, i) in items">
	<div v-touch:swipe="onSwipeItem(item, i)">Button</div>
</div>
```

```js
methods: {
	onSwipeItem(item, i) {
		return function (direction, mouseEvent) {
			console.log("Swiped item ", i, ": ", item, " in direction ", direction);
		};
	},
},
```




## Events

List of all supported events are given below.

**All events work on Desktop & Mobile devices.**

| <div style="width:170px">Event</div>                      | Behaviour                                                |
| ---------------------------- | ----------------------------------------------------- |
|  `v-touch`<br> `v-touch:tap` | **Desktop:** Triggered when the user clicks on the element (press and release). <br> **Mobile:** Triggered when the user taps on the element (tap and release)      |
| `v-touch:longtap` | **Desktop:** Triggered when the user holds on the element for `longTapTimeInterval` MS and then releases it (press and release). <br> **Mobile:** Triggered when the user taps and holds on the element for `longTapTimeInterval` MS and then releases it (tap and release)      |
| `v-touch:swipe`              | Triggered when the user drags on the element (swipe). <br> It will detect the direction of the swipe and send it to your callback. <br> First argument of the callback must be `direction` attribute, which can be `left`, `right`, `top` or `bottom`. <br> Example callback: `onSwipe(direction){ ... }` |
| `v-touch:swipe.left` <br>`v-touch:swipe.right` <br>`v-touch:swipe.top` <br>`v-touch:swipe.bottom` <br> | Triggered when the user drags on the element in a specific direction (directional swipe).
| `v-touch:hold`              | Triggered when the user holds the mouse button down for `touchHoldTolerance` MS while over the element (press and hold). <br> This will be triggered before your finger is released, similar to what native mobile apps do.    |
| `v-touch:press`              | **Desktop:** Triggered when the user presses the element (mouse down). <br> **Mobile:** Triggered when the user taps the element without releasing.    |
| `v-touch:drag.once`              | Triggered when the user presses and drags the element. <br> Only fired once, the moment the user first drags on the element.   |
| `v-touch:drag`             | Triggered when the user presses and drags the element. <br> Fired every time the mouse moves while dragging the element.  <br> This event is throttled to prevent too many events per second. <br>  This event will fire every `dragFrequency` MS.   |
| `v-touch:release`                | **Desktop:** Triggered when the user releases the element (mouse up). <br> **Mobile:** Triggered when the user taps and releases the element.  |
| `v-touch:rollover`                | **Desktop only:** Triggered when the user moves his mouse over the element. <br> This event is throttled to prevent too many events per second. <br> This event will fire every `rollOverFrequency` MS.  |



### Migration from Vue 2.x

Some events have been renamed from the vue 2.x version of this library, in order to expose a cleaner, more consistant and more descriptive naming scheme.

| Old event name               | New event name      |
| ---------------------------- | ------------------- |
| `v-touch:touchhold`          | `v-touch:hold`      |
| `v-touch:start`              | `v-touch:press`     |
| `v-touch:end`                | `v-touch:release`   |
| `v-touch:moved`              | `v-touch:drag.once` |
| `v-touch:moving`             | `v-touch:drag`      |



### System events

These are the default interactivity events supported by vue.js 3.x.

* You do not need to install this library to use them.
* They are always available for your usage alongside this library.
* The system default `mousemove` event is similar to `v-touch:rollover`, however the system event is not throttled and it will trigger hundreds of times per second, potentially crashing your application if any logic is performed in the event handler

**[Desktop devices](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent):**
- `v-on:click` - Triggered when the user presses and releases the element.
- `v-on:mousedown` - Triggered when the user presses the element.
- `v-on:mousemove` - Triggered when the user moves the mouse over the element.
- `v-on:mouseup` - Triggered when the user presses and releases the element.
- `v-on:mouseenter` - Triggered when the user moves his mouse into the element.
- `v-on:mouseleave` - Triggered when the user moves his mouse away from the element.

**[Mobile devices](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events):**
- `v-on:touchstart` - Triggered when the user presses the element.
- `v-on:touchmove` - Triggered when the user presses and drags over the element.
- `v-on:touchcancel` - Triggered when the user presses the element, and releases outside the element, thereby cancelling his tap.
- `v-on:touchend` - Triggered when the user taps the element (press and release).



## Options

These additional directives can be added to each element.

### v-touch-options

`v-touch-options` directive allows you set a different configuration for a specified component. It will override global configurations.

### v-touch-class

`v-touch-class` directive allows you automatically add a class when the element is rolled over (desktop) or tapped (mobile). It overrides the class specified in the global config option `touchClass`.

- By default the `touchClass` is added when the element is pressed (`mousedown`), and removed when the element is released (`mouseup`).
- If desktop events are enabled (`disableClick: false`), then the `touchClass` is added on roll over (`mouseenter`) and roll out (`mouseleave`) as well.
- You can use this instead of `:active` and `:hover` pseudo classes, as it works on both desktop and mobile

Behaviour:

<table>
	<tr>
		<th>Device</th>
		<th>Event name</th>
		<th>Effect</th>
		<th>Condition</th>
	</tr>
	<tr>
		<td rowspan="2">Desktop only</td>
		<td>Mouse enter (roll over)</td>
		<td>`touchClass` added</td>
		<td>desktop events must be enabled</td>
	</tr>
	<tr>
		<td>Mouse leave (roll out)</td>
		<td>`touchClass` removed</td>
		<td>desktop events must be enabled</td>
	</tr>
	<tr>
		<td rowspan="2">Mobile only</td>
		<td>Mouse down (press)</td>
		<td>`touchClass` added</td>
		<td></td>
	</tr>
	<tr>
		<td>Mouse up (release)</td>
		<td>`touchClass` removed</td>
		<td></td>
	</tr>
</table>

For example:

```html
<span v-touch:tap="touchHandler" v-touch-class="'active'">Tap Me</span>
```

Now, when you press the element, it will add an extra `active` class automatically, and when you release the element the class will be removed.

So that you can use this feature to instead of `:active` and `:hover` pseudo class, for a better user experience.

```css
/* before */
span:active,
span:hover {
	background: green;
}

/* now, you can write like this */
span.active {
	background: green;
}
```

## Global configuration

```js
Vue.use(Vue3TouchEvents, {
	disableClick: false, ...
});
```

- `disableClick` - Whether to disable desktop events. **Default:** `false`.

  Keep the default value or `false` if your application is used on desktop and mobile devices.

  If your application is only for mobile use, set this to `true` to get a better user experience, because it can resolve some touch pass-through issues encountered on mobile devices.

- `touchClass` - Which CSS class to add while an element is rolled over (desktop) or tapped (mobile). **Default:** `''`

  This is a global config, and you can use `v-touch-class` directive to override this setting for a single element.

- `tapTolerance` in pixels - How many pixels the user must drag on the element for it to register as a `tap` event. **Default:** `10` pixels.

- `touchHoldTolerance` in milliseconds - The timeout for a `hold` event. **Default:**  `400` MS

- `swipeTolerance` in pixels - How many pixels the user must drag on the element for it to register as a `swipe` event. **Default:**  `30` pixels.

- `longTapTimeInterval` in milliseconds - The minimum time interval to detect whether long tap event effective or not.  **Default:**  `400` MS.

- `dragFrequency` in milliseconds - How often should `drag` events be fired.  **Default:**  `100` MS (10 times a second).

- `rollOverFrequency` in milliseconds - How often should `rollover` events be fired.  **Default:**  `100` MS (10 times a second).

