## mj-style

This tag allows you to set CSS styles that will be applied to the <b>HTML</b> in your MJML document as well as the HTML outputted. The CSS styles will be added to the head of the rendered HTML by default, but can also be inlined by using the `inline="inline"` attribute.

Here is an example showing the use in combination with the `css-class` attribute, which is supported by all body components.

```xml
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-class name="mjclass" color="green" font-size="30px" />
    </mj-attributes>
    <mj-style inline="inline">
      .blue-text div {
        color: blue !important;
      }
    </mj-style>
    <mj-style>
      .red-text div {
        color: red !important;
        text-decoration: underline !important;
      }
    </mj-style>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text css-class="red-text">I'm red and underlined</mj-text>
        <mj-text css-class="blue-text">I'm blue because of inline</mj-text>
        <mj-text mj-class="mjclass">I'm green</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

<p style="text-align: center;" >
  <a href="https://mjml.io/try-it-live/components/head-style">
    <img width="100px" src="https://mjml.io/assets/img/svg/TRYITLIVE.svg" alt="try it live" />
  </a>
</p>

attribute            | unit          | description                         | default value
---------------------|---------------|-------------------------------------|---------------
inline               | string        | set to "inline" to inline styles    | n/a

<aside class="notice">
  Mjml generates multiple html elements from a single mjml element. For optimal flexibility, the `css-class` will be applied to the most outer html element, so if you want to target a specific sub-element with a css selector, you may need to look at the generated html to see which exact selector you need.
</aside>
