### mj-wrapper

Enables you to wrap multiple `mj-section` tags together. It's especially useful to achieve nested layouts with shared border or background images across sections.

<figure>
  <img src="https://static.mailjet.com/mjml-website/documentation/wrapper-example.png" alt="wrapper" />
</figure>

```xml
<mjml>
  <mj-body>
    <mj-wrapper border="1px solid #000000" padding="50px 30px">
      <mj-section border-top="1px solid #aaaaaa" border-left="1px solid #aaaaaa" border-right="1px solid #aaaaaa" padding="20px">
        <mj-column>
          <mj-image padding="0" src="https://placeholdit.imgix.net/~text?&w=350&h=150" />
        </mj-column>
      </mj-section>
      <mj-section border-left="1px solid #aaaaaa" border-right="1px solid #aaaaaa" padding="20px" border-bottom="1px solid #aaaaaa">
        <mj-column border="1px solid #dddddd">
          <mj-text padding="20px"> First line of text </mj-text>
          <mj-divider border-width="1px" border-style="dashed" border-color="lightgrey" padding="0 20px" />
          <mj-text padding="20px"> Second line of text </mj-text>
        </mj-column>
      </mj-section>
    </mj-wrapper>
  </mj-body>
</mjml>
```

The `full-width` attribute will be used to manage the background width.
Setting it will change the width of the section from the default 600px to 100%.

<div class="alert alert-important" role="alert">
  <p>Important</p>
  <p>When applying <code>full-width</code> to <code>mj-wrapper</code>, any <code>mj-section</code> tags which are also set to <code>full-width</code> will default to standard width.</p>
</div>

<div class="alert alert-caution" role="alert">
  <p>Caution</p>
  <p>If you're using the <code>background-url</code> attribute for <code>mj-wrapper</code> then do not add one into a child <code>mj-section</code> as this is not supported for Outlook desktop</p>
  <p>Also, if you’re using the <code>background-color</code> attribute for <code>mj-wrapper</code> and the <code>background-url</code> attribute on its <code>mj-section</code> or <code>mj-hero</code> children, the <code>background-color</code> will appear over the <code>background-image</code> on Outlook desktop.</p>
</div>

#### Attributes

| attribute             | accepts                 | description                                                                                            | default value |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------- |
| background-color      | CSS color formats       | section color                                                                                          |               |
| background-position   | string                  | CSS values, i.e. `left` `center` `right` + `top` `center` `bottom` <br>(see outlook limitations below) | `top center`  |
| background-position-x | string                  | CSS values, i.e. `left` `center` `right` <br>(see outlook limitations below)                           |               |
| background-position-y | string                  | CSS values, i.e. `top` `center` `bottom` <br>(see outlook limitations below)                           |               |
| background-repeat     | `repeat` `no-repeat`    | set the background image to repeat                                                                     |
| background-size       | string                  | CSS values e.g. `auto` `cover` `contain` `px` `%` size                                                 | `auto`        |
| background-url        | string                  | background image, in URL format                                                                        |               |
| border                | string                  | CSS border format                                                                                      |               |
| border-bottom         | string                  | CSS border format                                                                                      |               |
| border-left           | string                  | CSS border format                                                                                      |               |
| border-radius         | string                  | border radius                                                                                          |               |
| border-right          | string                  | CSS border format                                                                                      |               |
| border-top            | string                  | CSS border format                                                                                      |               |
| css-class             | string                  | class name, added to the root HTML element created                                                     |               |
| full-width            | `full-width` `false`    | applies a vertical gap between child `mj-section` instances                                            |               |
| gap                   | `px`                    | make the section full-width                                                                            |               |
| padding               | `px` `%`                | section padding, supports up to 4 parameters                                                           | `20px 0`      |
| padding-bottom        | `px` `%`                | section bottom padding                                                                                 |               |
| padding-left          | `px` `%`                | section left padding                                                                                   |               |
| padding-right         | `px` `%`                | section right padding                                                                                  |               |
| padding-top           | `px` `%`                | section top padding                                                                                    |               |
| text-align            | `left` `center` `right` | CSS text-align                                                                                         | `center`      |

<p class="cta-container"><a class="cta" href="https://mjml.io/try-it-live/components/wrapper">Try it live</a></p>
