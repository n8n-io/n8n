## mj-hero

This element displays a hero image.
It behaves like an `mj-section` with a single `mj-column`.

`background-height` and `background-width` attributes are mandatory.

It's best to use an image with width the same as the `mj-body` width
  (`width="600px"` by default).
For better results, it's best to use an image with height the same or larger
  than the `height` of `mj-hero`.

Use `background-color` to provide a fallback color
  in case an email client doesn't support `background-url`.

<aside class="notice">
  The "height" attribute is required only for 'mode="fixed-height"'.
</aside>

Fixed height

<p style="text-align: center;" >
  <img src="https://cloud.githubusercontent.com/assets/1830348/15354833/bfe7faaa-1cef-11e6-8d38-15e8951b6636.png"
     alt="demo background picture with fixed height" />
</p>

```xml
<mjml>
  <mj-body>
    <mj-hero
      mode="fixed-height"
      height="469px"
      background-width="600px"
      background-height="469px"
      background-url=
          "https://cloud.githubusercontent.com/assets/1830348/15354890/1442159a-1cf0-11e6-92b1-b861dadf1750.jpg"
      background-color="#2a3448"
      padding="100px 0px">
      <mj-text
        padding="20px"
        color="#ffffff"
        font-family="Helvetica"
        align="center"
        font-size="45px"
        line-height="45px"
        font-weight="900">
        GO TO SPACE
      </mj-text>
      <mj-button href="https://mjml.io/" align="center">
        ORDER YOUR TICKET NOW
      </mj-button>
    </mj-hero>
  </mj-body>
</mjml>
 ```

 <p style="text-align: center;" >
   <a href="https://mjml.io/try-it-live/components/hero">
     <img width="100px" src="https://mjml.io/assets/img/svg/TRYITLIVE.svg" alt="try it live" />
   </a>
 </p>

Fluid height

<p style="text-align: center;" >
  <img src="https://cloud.githubusercontent.com/assets/1830348/15354867/fc2f404a-1cef-11e6-92ac-92de9e438210.png"
      alt="demo background picture with fixed height" />
</p>

```xml
<mjml>
  <mj-body>
    <mj-hero
      mode="fluid-height"
      background-width="600px"
      background-height="469px"
      background-url=
          "https://cloud.githubusercontent.com/assets/1830348/15354890/1442159a-1cf0-11e6-92b1-b861dadf1750.jpg"
      background-color="#2a3448"
      padding="100px 0px">
      <mj-text
        padding="20px"
        color="#ffffff"
        font-family="Helvetica"
        align="center"
        font-size="45px"
        line-height="45px"
        font-weight="900">
        GO TO SPACE
      </mj-text>
      <mj-button href="https://mjml.io/" align="center">
        ORDER YOUR TICKET NOW
      </mj-button>
    </mj-hero>
  </mj-body>
</mjml>
```

<p style="text-align: center;" >
  <a href="https://mjml.io/try-it-live/components/hero/1">
    <img width="100px" src="https://mjml.io/assets/img/svg/TRYITLIVE.svg"
      alt="try it live" />
  </a>
</p>

attribute           | unit                                | description                                                          | default value
--------------------|-------------------------------------|----------------------------------------------------------------------|--------------
background-color    | color                               | hero background color                                                | #ffffff
background-height   | px                                  | height of the image used, mandatory                                  | none
background-position | top/center/bottom left/center/right | background image position                                            | center center
background-url      | url                                 | absolute background url                                              | n/a
background-width    | px                                  | width of the image used, mandatory                                   | parent element width
border-radius       | px                                  | border radius                                                        | n/a
height              | px                                  | hero section height (required for fixed-height mode)                 | 0px
mode                | fluid-height/fixed-height           | choose if the height is fixed based on the height attribute or fluid | fluid-height
padding             | px                                  | supports up to 4 parameters                                          | 0px
padding-bottom      | px                                  | bottom offset                                                        | 0px
padding-left        | px                                  | left offset                                                          | 0px
padding-right       | px                                  | right offset                                                         | 0px
padding-top         | px                                  | top offset                                                           | 0px
vertical-align      | top/middle/bottom                   | content vertical alignment                                           | top
