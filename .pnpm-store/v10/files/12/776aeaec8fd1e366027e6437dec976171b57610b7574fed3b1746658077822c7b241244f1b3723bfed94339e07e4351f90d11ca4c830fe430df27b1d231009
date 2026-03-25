# yaeti

Yet Another [EventTarget](https://developer.mozilla.org/es/docs/Web/API/EventTarget) Implementation.

The library exposes both the [EventTarget](https://developer.mozilla.org/es/docs/Web/API/EventTarget) interface and the [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) interface.


## Installation

```bash
$ npm install yaeti --save
```


## Usage

```javascript
var yaeti = require('yaeti');


// Custom class we want to make an EventTarget.
function Foo() {
    // Make Foo an EventTarget.
    yaeti.EventTarget.call(this);
}

// Create an instance.
var foo = new Foo();

function listener1() {
    console.log('listener1');
}

function listener2() {
    console.log('listener2');
}
 
foo.addEventListener('bar', listener1);
foo.addEventListener('bar', listener2);
foo.removeEventListener('bar', listener1);

var event = new yaeti.Event('bar');

foo.dispatchEvent(event);


// Output:
// => "listener2"
```



## API


#### `yaeti.EventTarget` interface

Implementation of the [EventTarget](https://developer.mozilla.org/es/docs/Web/API/EventTarget) interface.

* Make a custom class inherit from `EventTarget`:
```javascript
function Foo() {
    yaeti.EventTarget.call(this);
}
```

* Make an existing object an `EventTarget`:
```javascript
yaeti.EventTarget.call(obj);
```

The interface implements the `addEventListener`, `removeEventListener` and `dispatchEvent` methods as defined by the W3C.


##### `listeners` read-only property

Returns an object whose keys are configured event types (String) and whose values are an array of listeners (functions) for those event types.


#### `yaeti.Event` interface

Implementation of the [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) interface.

*NOTE:* Just useful in Node (the browser already exposes the native `Event` interface).

```javascript
var event = new yaeti.Event('bar');
```


## Author

[Iñaki Baz Castillo](https://github.com/ibc)


## License

[MIT](./LICENSE)
