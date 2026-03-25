## mj-attributes

Inside `mj-attributes`, a tag citing one MJML component (like `mj-text`;
see example) overrides default settings for listed MJML attributes
on the one component.

An `mj-all` is like the above, but affects all MJML components via the one tag.

`mj-class` tags create a named group of MJML attributes you can apply to MJML
components. To apply them, use `mj-class="<name>"`.

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

<p style="text-align: center;" >
  <a href="https://mjml.io/try-it-live/components/head-attributes">
    <img width="100px" src="https://mjml.io/assets/img/svg/TRYITLIVE.svg" alt="try it live" />
  </a>
</p>

<aside class="notice">
  In the following list, MJML applies only the first MJML attributes found:
  <ul>
    <li>inline MJML attributes,</li>
    <li>the entry for the same MJML component (like, "mj-text") in "mj-attributes",</li>
    <li>"mj-all" in "mj-attributes", and</li>
    <li>default MJML values.</li>
  </ul>
</aside>
