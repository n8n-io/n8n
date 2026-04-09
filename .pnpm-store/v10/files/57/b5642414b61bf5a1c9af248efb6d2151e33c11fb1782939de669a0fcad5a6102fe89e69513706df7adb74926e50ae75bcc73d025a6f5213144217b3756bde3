### mj-section

Sections are rows within your email. They will be used to structure the layout.

```xml
<mjml>
  <mj-body>
    <mj-section full-width="full-width" background-color="red">
      <!-- Your columns go here -->
    </mj-section>
  </mj-body>
</mjml>
```

The `full-width` attribute will be used to manage the background width. Setting it will change the width of the section from the default 600px to 100%.

<div class="alert alert-note" role="alert">
  <p>Note</p>
  <p>To invert the order in which columns display in the desktop view, first setup your columns in the order you want them to appear stacked in the mobile view and then add <code>direction="rtl"</code> to the <code>mj-section</code> tag.</p>
</div>

<div class="alert alert-caution" role="alert">
  <p>Caution</p>
  <p><code>mj-section</code> tags cannot nest in other <code>mj-section</code> tags</p>
</div>

<div class="alert alert-important" role="alert">
  <p>Important</p>
  <p>Limitations of <code>background-image</code> <code>background-size</code> and <code>background-position</code> in Outlook desktop :</p>
  <ul>
    <li>If <code>background-size</code> is not specified, <code>no-repeat</code> will be ignored in Outlook.</li>
    <li>If the specified <code>background-size</code> is a single attribute in percent, the height will be <code>auto</code> as in standard CSS. In Outlook, the image will never overflow the element, it will shrink instead of being cropped similar to other clients.</li>
  </ul>
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
| direction             | `ltr` `rtl`             | set the display order of direct children                                                               | `ltr`         |
| full-width            | `full-width` `false`    | make the section full-width                                                                            |               |
| padding               | `px` `%`                | section padding, supports up to 4 parameters                                                           | `20px 0`      |
| padding-bottom        | `px` `%`                | section bottom padding                                                                                 |               |
| padding-left          | `px` `%`                | section left padding                                                                                   |               |
| padding-right         | `px` `%`                | section right padding                                                                                  |               |
| padding-top           | `px` `%`                | section top padding                                                                                    |               |
| text-align            | `left` `center` `right` | CSS text-align                                                                                         | `center`      |

<p class="cta-container"><a class="cta" href="https://mjml.io/try-it-live/components/section">Try it live</a></p>
