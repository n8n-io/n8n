### mj-html-attributes

Allows you to add custom attributes on any HTML tag within the generated HTML, using CSS selectors.

It's not needed for most email creations, but can be useful in some cases, e.g. editable templates.

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

In the generated HTML, an `mj-text` tag becomes a `td` tag with a child `div` tag.

In this example, the `td` tag will have the `class="custom"` attribute. Using the css selector `path=".custom div"`, the `div` inside the `td` will get the attribute `data-id="42"`.

To use this component, you will likely have to look at the generated HTML to see exactly where the `css-class` is applied, to know which CSS selector you need to add your custom attribute to.

You can use multiple `mj-selector` tags inside a `mj-html-attributes` tag, and multiple `mj-html-attribute` tags inside a `mj-selector` tag.

<p class="cta-container"><a class="cta" href="https://mjml.io/try-it-live/components/head-html-attributes">Try it live</a></p>
