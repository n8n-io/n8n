## mj-column

Columns enable you to horizontally organize the content within your sections. They must be located under `mj-section` tags in order to be considered by the engine.
To be responsive, columns are expressed in terms of percentage.

<aside class="notice">
  The sum of columns in a section cannot be greater than
      the width of the parent `mj-section` (or 100%).
</aside>

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

<p style="text-align: center;" >
  <a href="https://mjml.io/try-it-live/components/column">
    <img width="100px" src="https://mjml.io/assets/img/svg/TRYITLIVE.svg" alt="try it live" />
  </a>
</p>

<aside class="notice">
  Columns are meant to be used as a container for your content. They must not be used as offset. Any mj-element included in a column will have a width equivalent to 100% of this column's width.
</aside>

<aside class="warning">
  Columns cannot be nested into columns, and sections cannot be nested into columns as well.
</aside>

attribute              | unit        | description                                                                                  | default attributes
-----------------------|-------------|----------------------------------------------------------------------------------------------|----------------------------------------------
background-color       | color       | background color for a column                                                                | n/a
inner-background-color | color       | requires: a padding, inner background color for column                                       | n/a
border                 | string      | css border format                                                                            | none
border-bottom          | string      | css border format                                                                            | n/a
border-left            | string      | css border format                                                                            | n/a
border-right           | string      | css border format                                                                            | n/a
border-top             | string      | css border format                                                                            | n/a
border-radius          | percent/px  | border radius                                                                                | n/a
inner-border           | string      | css border format                                                                            | n/a
inner-border-bottom    | string      | css border format ; requires a padding                                                       | n/a
inner-border-left      | string      | css border format ; requires a padding                                                       | n/a
inner-border-right     | string      | css border format ; requires a padding                                                       | n/a
inner-border-top       | string      | css border format ; requires a padding                                                       | n/a
inner-border-radius    | percent/px  | border radius ; requires a padding                                                           | n/a
width                  | percent/px  | column width                                                                                 | (100 / number of non-raw elements in section)%
vertical-align         | string      | middle/top/bottom (note: middle works only when adjacent mj-column is also set to middle)    | top
padding                | px          | supports up to 4 parameters                                                                  | n/a
padding-top            | px          | section top offset                                                                           | n/a
padding-bottom         | px          | section bottom offset                                                                        | n/a
padding-left           | px          | section left offset                                                                          | n/a
padding-right          | px          | section right offset                                                                         | n/a
css-class              | string      | class name, added to the root HTML element created                                           | n/a
