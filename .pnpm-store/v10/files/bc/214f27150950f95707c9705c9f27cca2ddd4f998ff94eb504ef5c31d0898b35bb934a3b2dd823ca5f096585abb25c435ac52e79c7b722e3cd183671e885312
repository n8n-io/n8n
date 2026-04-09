### mj-attributes

Inside the `mj-attributes` tag, you can cite other MJML components, like `mj-text` for example, to override the default settings for that component.

An `mj-all` tag is like the above, but affects all MJML components.

An `mj-class` tag creates a named group of MJML attributes you can apply to MJML
components using `mj-class="<name>"`.

```xml
<mjml>
 <mj-head>
   <mj-attributes>
     <mj-text padding="0" />
     <mj-class name="blue" color="blue" />
     <mj-class name="big" font-size="20px" />
     <mj-all font-family="Arial" />
   </mj-attributes>
 </mj-head>
 <mj-body>
   <mj-section>
     <mj-column>
       <mj-text mj-class="blue big">
         Hello World!
       </mj-text>
     </mj-column>
   </mj-section>
 </mj-body>
</mjml>
```

<div class="alert alert-important" role="alert">
  <p>Important</p>
  <p>MJML will apply found attributes in the following order:</p>
  <ul>
    <li>inline attributes within tags,</li>
    <li>attributes found in tags within the <code>mj-attributes</code> tag, e.g. <code>mj-text</code>,</li>
    <li>the <code>mj-all</code> tag wuthin <code>mj-attributes</code>, and</li>
    <li>the default MJML values.</li>
  </ul>
</div>

<p class="cta-container"><a class="cta" href="https://mjml.io/try-it-live/components/head-attributes">Try it live</a></p>
