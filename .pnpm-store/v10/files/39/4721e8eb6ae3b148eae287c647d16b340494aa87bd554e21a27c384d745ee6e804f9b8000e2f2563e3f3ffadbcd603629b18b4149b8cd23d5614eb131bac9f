# PostCSS Nested

<img align="right" width="135" height="95"
     title="Philosopher’s stone, logo of PostCSS"
     src="https://postcss.org/logo-leftp.svg">

[PostCSS] plugin to unwrap nested rules closer to Sass syntax.

```css
.phone {
    &_title {
        width: 500px;
        @media (max-width: 500px) {
            width: auto;
        }
        body.is_dark & {
            color: white;
        }
    }
    img {
        display: block;
    }
}

.title {
  font-size: var(--font);

  @at-root html {
      --font: 16px
  }
}
```

will be processed to:

```css
.phone_title {
    width: 500px;
}
@media (max-width: 500px) {
    .phone_title {
        width: auto;
    }
}
body.is_dark .phone_title {
    color: white;
}
.phone img {
    display: block;
}

.title {
  font-size: var(--font);
}
html {
  --font: 16px
}
```

Related plugins:

* Use [`postcss-current-selector`] **after** this plugin if you want
  to use current selector in properties or variables values.
* Use [`postcss-nested-ancestors`] **before** this plugin if you want
  to reference any ancestor element directly in your selectors with `^&`.

Alternatives:

* See also [`postcss-nesting`], which implements [CSSWG draft].
* [`postcss-nested-props`] for nested properties like `font-size`.

<a href="https://evilmartians.com/?utm_source=postcss-nested">
  <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg"
       alt="Sponsored by Evil Martians" width="236" height="54">
</a>

[`postcss-current-selector`]: https://github.com/komlev/postcss-current-selector
[`postcss-nested-ancestors`]: https://github.com/toomuchdesign/postcss-nested-ancestors
[`postcss-nested-props`]:     https://github.com/jedmao/postcss-nested-props
[`postcss-nesting`]:          https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting
[CSSWG draft]:              https://drafts.csswg.org/css-nesting-1/
[PostCSS]:                  https://github.com/postcss/postcss


## Docs
Read full docs **[here](https://github.com/postcss/postcss-nested#readme)**.
