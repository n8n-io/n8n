## mj-group


<p style="text-align: center;" >
  Desktop<br />
  <img src="https://cloud.githubusercontent.com/assets/570317/15677458/a6ad2c1c-274a-11e6-8fdf-6853d748ef27.png"
       alt="easy and quick; responsive" />
</p>

<p style="text-align: center;" >
  Mobile<br />
  <img src="https://cloud.githubusercontent.com/assets/570317/15677396/6bb62708-274a-11e6-8c59-0d8b3944a2ae.png"
      alt="easy and quick; responsive" />
</p>

mj-group allows you to prevent columns from stacking on mobile. To do so, wrap the columns inside a `mj-group` tag, so they'll stay side by side on mobile.

```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-group>
        <mj-column>
          <mj-image width="137px" height="185px" padding="0"    src="https://mjml.io/assets/img/easy-and-quick.png" />
          <mj-text align="center">
            <h2>Easy and quick</h2>
            <p>Write less code, save time and code more efficiently with MJML’s semantic syntax.</p>
          </mj-text>
        </mj-column>
        <mj-column>
          <mj-image width="166px" height="185px" padding="0" src="https://mjml.io/assets/img/responsive.png" />
          <mj-text align="center">
            <h2>Responsive</h2>
            <p>MJML is responsive by design on most-popular email clients, even Outlook.</p>
          </mj-text>
        </mj-column>
      </mj-group>
    </mj-section>
  </mj-body>
</mjml>
```

<p style="text-align: center;" >
  <a href="https://mjml.io/try-it-live/components/group"><img width="100px" src="https://mjml.io/assets/img/svg/TRYITLIVE.svg" alt="try it live" /></a>
</p>

<aside class="notice">
  Column inside a group must have a width in percentage, not in pixel
</aside>


<aside class="notice">
  You can have both column and group inside a Section
</aside>

<aside class="notice">
  <b>iOS 9 Issue:</b> If you use a HTML beautifier for MJML output, iOS9 will render your columns inside a mj-group as stacked. On the output HTML, remove the <b>blank space</b> between the two columns inside a mj-group.
</aside>


attribute           | unit        | description                    | default attributes
--------------------|-------------|--------------------------------|--------------------------------------
width               | percent/px  | group width                    | (100 / number of non-raw elements in section)%
vertical-align      | string      | middle/top/bottom              | top
background-color    | string      | background color for a group   | n/a
direction           | ltr / rtl   | set the display order of direct children | ltr
css-class           | string      | class name, added to the root HTML element created | n/a
