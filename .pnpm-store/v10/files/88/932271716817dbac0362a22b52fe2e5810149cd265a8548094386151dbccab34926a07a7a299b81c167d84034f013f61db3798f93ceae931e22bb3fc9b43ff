### mj-column

Columns enable you to organize the content of your sections into distinct columns which stack when viewed on a mobile device.

They must be located within `mj-section` tags in order to be considered by the engine.

<div class="alert alert-caution" role="alert">
  <p>Caution</p>
  <p>The sum of columns in a section cannot be greater than
      the width of the parent <code>mj-section</code> (or 100%).</p>
</div>

Every single column has to contain something because they are responsive containers, and will be vertically stacked on a mobile view. Any standard component, or component that you have defined and registered, can be placed within a column – except `mj-column` or `mj-section` elements.

```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <!-- Your first column -->
      </mj-column>
      <mj-column>
        <!-- Your second column -->
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

<div class="alert alert-caution" role="alert">
  <p>Caution</p>
  <p>Columns are used as a container for your content and should not be used to offset. Any MJML component included in a column will have a width equivalent to 100% of this column's width.</p>
</div>

<div class="alert alert-caution" role="alert">
  <p>Caution</p>
  <p>Neither the <code>mj-column</code> or <code>mj-section</code> tags can be nested in an <code>mj-column</code> tag</p>
</div>

#### Attributes

| attribute              | accepts                 | description                                                                              | default attributes                             |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| background-color       | CSS color formats       | background color for a column                                                            |                                                |
| border                 | string                  | CSS border format                                                                        |                                                |
| border-bottom          | string                  | CSS border format                                                                        |                                                |
| border-left            | string                  | CSS border format                                                                        |                                                |
| border-radius          | `px` `%`                | border radius                                                                            |                                                |
| border-right           | string                  | CSS border format                                                                        |                                                |
| border-top             | string                  | CSS border format                                                                        |                                                |
| css-class              | string                  | class name, added to the root HTML element created                                       |                                                |
| direction              | `ltr` `rtl`             | set the display order of direct children                                                 | `ltr`                                          |
| inner-background-color | CSS color formats       | inner background color for column; requires a padding                                    |                                                |
| inner-border           | string                  | CSS border; requires a padding format                                                    |                                                |
| inner-border-bottom    | string                  | CSS border format; requires a padding                                                    |                                                |
| inner-border-left      | string                  | CSS border format; requires a padding                                                    |                                                |
| inner-border-radius    | `px` `%`                | border radius ; requires a padding                                                       |                                                |
| inner-border-right     | string                  | CSS border format; requires a padding                                                    |                                                |
| inner-border-top       | string                  | CSS border format; requires a padding                                                    |                                                |
| padding                | `px` `%`                | column padding, supports up to 4 parameters                                              |                                                |
| padding-bottom         | `px` `%`                | column bottom padding                                                                    |                                                |
| padding-left           | `px` `%`                | column left padding                                                                      |                                                |
| padding-right          | `px` `%`                | column right padding                                                                     |                                                |
| padding-top            | `px` `%`                | column top padding                                                                       |                                                |
| width                  | `px` `%`                | column width                                                                             | (100 / number of non-raw elements in section)% |
| vertical-align         | `top` `middle` `bottom` | vertical alignment.<br>Note: `middle` only applies when all `mj-column` instances use it | `top`                                          |

<p class="cta-container"><a class="cta" href="https://mjml.io/try-it-live/components/column">Try it live</a></p>
