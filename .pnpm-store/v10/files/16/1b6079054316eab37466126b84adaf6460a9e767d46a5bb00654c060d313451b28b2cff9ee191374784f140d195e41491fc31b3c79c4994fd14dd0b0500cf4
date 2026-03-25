# tailwindcss/nesting

This is a PostCSS plugin that wraps [postcss-nested](https://github.com/postcss/postcss-nested) or [postcss-nesting](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting) and acts as a compatibility layer to make sure your nesting plugin of choice properly understands Tailwind's custom syntax like `@apply` and `@screen`.

Add it to your PostCSS configuration, somewhere before Tailwind itself:

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-import'),
    require('tailwindcss/nesting'),
    require('tailwindcss'),
    require('autoprefixer'),
  ]
}
```

By default, it uses the [postcss-nested](https://github.com/postcss/postcss-nested) plugin under the hood, which uses a Sass-like syntax and is the plugin that powers nesting support in the [Tailwind CSS plugin API](https://tailwindcss.com/docs/plugins#css-in-js-syntax).

If you'd rather use [postcss-nesting](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting) (which is based on the work-in-progress [CSS Nesting](https://drafts.csswg.org/css-nesting-1/) specification), first install the plugin alongside:

```shell
npm install postcss-nesting
```

Then pass the plugin itself as an argument to `tailwindcss/nesting` in your PostCSS configuration:

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-import'),
    require('tailwindcss/nesting')(require('postcss-nesting')),
    require('tailwindcss'),
    require('autoprefixer'),
  ]
}
```

This can also be helpful if for whatever reason you need to use a very specific version of `postcss-nested` and want to override the version we bundle with `tailwindcss/nesting` itself.

