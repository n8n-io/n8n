[![Build Status](https://travis-ci.org/tildeio/route-recognizer.svg)](https://travis-ci.org/tildeio/route-recognizer)

# About
`route-recognizer` is a lightweight JavaScript library (under 2k!) that
can be used as the recognizer for a more comprehensive router system
(such as [`router.js`](https://github.com/tildeio/router.js)).

In keeping with the Unix philosophy, it is a modular library that does one
thing and does it well.

# Usage

Create a new router:

```javascript
var router = new RouteRecognizer();
```

Add a simple new route description:

```javascript
router.add([{ path: "/posts", handler: handler }]);
```

Every route can optionally have a name:
```javascript
router.add([{ path: "/posts", handler: handler }], { as: "routeName"});
```

The handler is an opaque object with no specific meaning to
`route-recognizer`. A module using `route-recognizer` could
use functions or other objects with domain-specific semantics
for what to do with the handler.

A route description can have handlers at various points along
the path:

```javascript
router.add([
  { path: "/admin", handler: admin },
  { path: "/posts", handler: posts }
]);
```

Recognizing a route will return a list of the handlers and
their associated parameters:

```javascript
var result = router.recognize("/admin/posts");
result === [
  { handler: admin, params: {} },
  { handler: posts, params: {} }
];
```

Dynamic segments:

```javascript
router.add([
  { path: "/posts/:id", handler: posts },
  { path: "/comments", handler: comments }
]);

result = router.recognize("/posts/1/comments");
result === [
  { handler: posts, params: { id: "1" } },
  { handler: comments, params: {} }
];
```

A dynamic segment matches any character but `/`.

Star segments:

```javascript
router.add([{ path: "/pages/*path", handler: page }]);

result = router.recognize("/pages/hello/world");
result === [{ handler: page, params: { path: "hello/world" } }];
```

# Sorting

If multiple routes all match a path, `route-recognizer`
will pick the one with the fewest dynamic segments:

```javascript
router.add([{ path: "/posts/edit", handler: editPost }]);
router.add([{ path: "/posts/:id", handler: showPost }]);
router.add([{ path: "/posts/new", handler: newPost }]);

var result1 = router.recognize("/posts/edit");
result1 === [{ handler: editPost, params: {} }];

var result2 = router.recognize("/posts/1");
result2 === [{ handler: showPost, params: { id: "1" } }];

var result3 = router.recognize("/posts/new");
result3 === [{ handler: newPost, params: {} }];
```

As you can see, this has the expected result. Explicit
static paths match more closely than dynamic paths.

This is also true when comparing star segments and other
dynamic segments. The recognizer will prefer fewer star
segments and prefer using them for less of the match (and,
consequently, using dynamic and static segments for more
of the match).

# Building / Running Tests

This project uses Ember CLI and Broccoli for building and testing.

## Getting Started

Run the following commands to get going:

```bash
npm install
bower install
```

The above assumes that you have `bower` installed globally (you can install
via `npm install -g bower` if you do not).

## Running Tests

Run the following:

```
npm start
```

At this point you can navigate to the url specified in the Testem UI (usually
http://localhost:7357/). As you change the project the tests will rerun.

## Building

```
npm run build
```
