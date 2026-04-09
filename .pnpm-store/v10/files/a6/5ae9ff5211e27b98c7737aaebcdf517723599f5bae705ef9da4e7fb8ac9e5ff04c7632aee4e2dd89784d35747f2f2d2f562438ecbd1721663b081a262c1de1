### mj-hero

Displays a hero image and behaves like an `mj-section` tag with a single `mj-column` tag.

The `background-height` and `background-width` attributes are mandatory and it's best to use an image with width the same as the `mj-body` (`width="600px"` by default) and height the same or larger than the `height` of `mj-hero`.

Use `background-color` to provide a fallback color in case an email client doesn't support `background-url`.

<div class="alert alert-note" role="alert">
  <p>Note</p>
  <p>The <code>height</code> attribute is only required for <code>mode="fixed-height"</code>.</p>
</div>

<figure>
  <figcaption>Fixed height</figcaption>
  <img src="https://static.mailjet.com/mjml-website/documentation/hero-example-1.png"
     alt="demo background picture with fixed height" />
</figure>

```xml
<mjml>
  <mj-body>
    <mj-hero
      mode="fixed-height"
      height="469px"
      background-width="600px"
      background-height="469px"
      background-url=
          "https://static.mailjet.com/mjml-website/documentation/hero.jpg"
      background-color="#2a3448"
      padding="100px 0px">
      <mj-text
        padding="20px"
        color="#ffffff"
        font-family="Helvetica"
        align="center"
        font-size="45px"
        line-height="45px"
        font-weight="900">
        GO TO SPACE
      </mj-text>
      <mj-button href="https://mjml.io/" align="center">
        ORDER YOUR TICKET NOW
      </mj-button>
    </mj-hero>
  </mj-body>
</mjml>
```

<figure>
  <figcaption>Fluid height</figcaption>
  <img src="https://static.mailjet.com/mjml-website/documentation/hero-example-1.png"
     alt="demo background picture with fixed height" />
</figure>

```xml
<mjml>
  <mj-body>
    <mj-hero
      mode="fluid-height"
      background-width="600px"
      background-height="469px"
      background-url=
          "https://static.mailjet.com/mjml-website/documentation/hero.jpg"
      background-color="#2a3448"
      padding="100px 0px">
      <mj-text
        padding="20px"
        color="#ffffff"
        font-family="Helvetica"
        align="center"
        font-size="45px"
        line-height="45px"
        font-weight="900">
        GO TO SPACE
      </mj-text>
      <mj-button href="https://mjml.io/" align="center">
        ORDER YOUR TICKET NOW
      </mj-button>
    </mj-hero>
  </mj-body>
</mjml>
```

#### Attributes

| attribute              | accepts                 | description                                                        | default value                 |
| ---------------------- | ----------------------- | ------------------------------------------------------------------ | ----------------------------- |
| background-color       | CSS color formats       | hero background color                                              | #ffffff                       |
| background-height      | `px` `%`                | height of the image used, mandatory                                |                               |
| background-position    | string                  | CSS values, i.e. `left` `center` `right` + `top` `center` `bottom` | `center center`               |
| background-url         | string                  | absolute background in URL format                                  | `null`                        |
| background-width       | `px` `%`                | width of the image used, mandatory                                 | inherits parent element width |
| border-radius          | string                  | border radius                                                      |                               |
| css-class              | string                  | class name, added to the root HTML element created                 |                               |
| height                 | `px` `%`                | hero section height, (required for `fixed-height` mode)            | `0px`                         |
| inner-background-color | CSS color formats       | content background color                                           |                               |
| mode                   | string                  | `fluid-height` or `fixed-height`                                   | `fluid-height`                |
| padding                | `px` `%`                | hero padding, supports up to 4 parameters                          | `0px`                         |
| padding-bottom         | `px` `%`                | hero bottom padding                                                | `null`                        |
| padding-left           | `px` `%`                | hero left padding                                                  | `null`                        |
| padding-right          | `px` `%`                | hero right padding                                                 | `null`                        |
| padding-top            | `px` `%`                | hero top padding                                                   | `null`                        |
| vertical-align         | `top` `middle` `bottom` | content vertical alignment                                         | `top`                         |

<ul class="cta-container">
  <li>Fixed height: <br><a class="cta" href="https://mjml.io/try-it-live/components/hero">Try it live</a></li>
  <li>Fluid height: <br><a class="cta" href="https://mjml.io/try-it-live/components/hero/1">Try it live</a></li>
</ul>
