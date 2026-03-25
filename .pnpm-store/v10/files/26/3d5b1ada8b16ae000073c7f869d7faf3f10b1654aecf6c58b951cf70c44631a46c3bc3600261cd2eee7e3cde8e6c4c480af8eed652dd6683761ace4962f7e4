## mj-html-attributes

This tag allows you to add custom attributes on any html tag of the generated html, using css selectors.
It's not needed for most email creations, but can be useful in some cases, i.e. editable templates.

 ```xml
<mjml>
  <mj-head>
    <mj-html-attributes>
      <mj-selector path=".custom div">
        <mj-html-attribute name="data-id">42</mj-html-attribute>
      </mj-selector>
    </mj-html-attributes>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text css-class="custom">
          Hello World!
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
 ```

In the generated html, a mj-text becomes a `td`, and a `div` inside this `td`. In this example, the `td` will have the `class="custom"`. Using the css selector `path=".custom div"`, the `div` inside the `td` will get the attribute `data-id="42"`.

To use this component, you will likely have to look at the generated html to see where exactly are the `css-class` applied, to know which css selector you need to use to add your custom attribute on the right html tag.

You can use multiple `mj-selector` inside a `mj-html-attributes`, and multiple `mj-html-attribute` inside a `mj-selector`.
  

<p style="text-align: center;" >
  <a href="https://mjml.io/try-it-live/components/head-html-attributes">
    <img width="100px" src="https://mjml.io/assets/img/svg/TRYITLIVE.svg" alt="try it live" />
  </a>
</p>
