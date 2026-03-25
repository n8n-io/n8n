# Autoprefixer [![Cult Of Martians][cult-img]][cult]

<img align="right" width="94" height="71"
     src="https://postcss.github.io/autoprefixer/logo.svg"
     title="Autoprefixer logo by Anton Lovchikov">

[PostCSS] plugin to parse CSS and add vendor prefixes to CSS rules using values
from [Can I Use]. It is recommended by Google and used in Twitter and Alibaba.

Write your CSS rules without vendor prefixes (in fact, forget about them
entirely):

```css
::placeholder {
  color: gray;
}

.image {
  background-image: url(image@1x.png);
}
@media (min-resolution: 2dppx) {
  .image {
    background-image: url(image@2x.png);
  }
}
```

Autoprefixer will use the data based on current browser popularity and property
support to apply prefixes for you. You can try the [interactive demo]
of Autoprefixer.

```css
::-moz-placeholder {
  color: gray;
}
::placeholder {
  color: gray;
}

.image {
  background-image: url(image@1x.png);
}
@media (-webkit-min-device-pixel-ratio: 2),
       (min-resolution: 2dppx) {
  .image {
    background-image: url(image@2x.png);
  }
}
```

Twitter account for news and releases: [@autoprefixer].

<a href="https://evilmartians.com/?utm_source=autoprefixer">
<img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg" alt="Sponsored by Evil Martians" width="236" height="54">
</a>

[interactive demo]: https://autoprefixer.github.io/
[@autoprefixer]:    https://twitter.com/autoprefixer
[Can I Use]:        https://caniuse.com/
[cult-img]:         https://cultofmartians.com/assets/badges/badge.svg
[PostCSS]:          https://github.com/postcss/postcss
[cult]:             https://cultofmartians.com/tasks/autoprefixer-grid.html


## Docs
Read full docs **[here](https://github.com/postcss/autoprefixer#readme)**.
