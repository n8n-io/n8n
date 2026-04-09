### mj-style

Allows you to set CSS styles that will be applied to your MJML document as well as the outputted HTML.

The CSS styles will be added to the `head` tag of the rendered HTML by default, but can also be inlined by using the `inline="inline"` attribute.

Here is an example showing its use in combination with the `css-class` attribute, which is supported by all body components.

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

<div class="alert alert-tip" role="alert">
  <p>Tip</p>
  <p>MJML generates multiple HTML tags from a single MJML tag. For optimal flexibility, the <code>css-class</code> will be applied to the most outer HTML tag, therefore if you want to target a specific child tag with a CSS selector, you may need to look at the generated HTML to determine the exact selector you need.</p>
</div>

#### Attributes

| attribute | accepts | description                      | default value |
| --------- | ------- | -------------------------------- | ------------- |
| inline    | string  | set to `inline` to inline styles |               |

<p class="cta-container"><a class="cta" href="https://mjml.io/try-it-live/components/head-style">Try it live</a></p>
