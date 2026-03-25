<h1 align="center"> vue 3 infinite loading </h1>
<p align="center">
  <a href="https://www.npmjs.com/package/v3-infinite-loading"><img src="https://img.shields.io/npm/dm/v3-infinite-loading.svg"></a>
  <a href="https://www.npmjs.com/package/v3-infinite-loading"><img src="https://img.shields.io/npm/v/v3-infinite-loading.svg"></a>
  <a href="https://www.npmjs.com/package/v3-infinite-loading"><img src="https://img.shields.io/npm/l/v3-infinite-loading.svg"></a>
</p>

## Intro

An infinite scroll component compatible with vue.js 3 and vite, to help you implement an infinite scroll list more easily.

## Features

- Lightweight and simple to use
- Internal spinner
- 2-directional support (Top and bottom)

## Install

```Bash
npm install v3-infinite-loading
```

## Basic usage

register globally:

```JavaScript
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css"; //required if you're not going to override default slots

const app = createApp(App);

app.component("infinite-loading", InfiniteLoading);

app.mount("#app");
```

usage in SFC with script setup:

```html
<script setup>
  import InfiniteLoading from "v3-infinite-loading";
  import "v3-infinite-loading/lib/style.css"; //required if you're not going to override default slots
</script>

<template>
  <InfiniteLoading />
</template>
```

## Browser usage

```html
<html>
  <head>
    <script src="https://unpkg.com/vue@3.2.37/dist/vue.global.js"></script>
    <script src="https://unpkg.com/v3-infinite-loading@1.2.1/lib/v3-infinite-loading.umd.js"></script>
    <link
      rel="stylesheet"
      href="https://unpkg.com/v3-infinite-loading@1.2.1/lib/style.css"
    />
  </head>
  <body>
    <div id="app">
      <infinite-loading target="#app" @infinite="infiniteHandler"></infinite-loading>
    </div>
    <script>
      const { ref, createApp } = Vue;
      const app = createApp({
        // your app
      });
      app.component("infinite-loading", V3InfiniteLoading.default);
      app.mount("#app");
    </script>
  </body>
</html>
```

### Checkout a full working example on [codepen](https://codepen.io/oumoussa98/pen/GRxNxBr) or [github gists](https://gist.github.com/oumoussa98/7184e74bab47d78a60a8bdf0aea68d96)

## Usage & Guide

Documentation available on [v3-infinite-loading Netlify](https://vue3-infinite-loading.netlify.com/)

Check out live demo [v3-infinite-loading-demo Netlify](https://vue3-infinite-loading-demo.netlify.com/)

## Changelog

Detailed changes for each release are documented in the [release notes](https://github.com/oumoussa98/vue3-infinite-loading/releases).

## Contribution

Comming soon

## Licence

The MIT License (MIT)
