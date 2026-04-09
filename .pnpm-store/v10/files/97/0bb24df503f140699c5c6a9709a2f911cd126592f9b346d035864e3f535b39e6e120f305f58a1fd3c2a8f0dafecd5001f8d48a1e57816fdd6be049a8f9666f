### mj-social

Displays calls-to-action for various social networks with their associated logo. You can add multiple social networks using `mj-social-element` tags.

<figure>
  <img src="https://static.mailjet.com/mjml-website/documentation/social-example.png" alt="desktop" style="width: 250px;"/>
</figure>

<div class="alert alert-caution" role="alert">
  <p>Caution</p>
  <p>The <code>mj-social-element</code> <code>name</code> attribute is a shortcut for some common social elements. You should avoid rely too much on this as those icons are hosted by Mailjet for their Email Builder. Use <a href="#custom-social-element">custom element syntax instead.</a></p>
</div>

```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-social font-size="15px" icon-size="30px" mode="horizontal">
          <mj-social-element name="facebook" href="https://mjml.io/">
            Facebook
          </mj-social-element>
          <mj-social-element name="google" href="https://mjml.io/">
            Google
          </mj-social-element>
          <mj-social-element name="twitter" href="https://mjml.io/">
            Twitter
          </mj-social-element>
          <mj-social-element name="x" href="https://mjml.io/">
            X
          </mj-social-element>
        </mj-social>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

#### Attributes

| attribute                  | accepts                 | description                                        | default value                          |
| -------------------------- | ----------------------- | -------------------------------------------------- | -------------------------------------- |
| align                      | `left` `right` `center` | align content                                      | `center`                               |
| border-radius              | `px` `%`                | border radius                                      | `3px`                                  |
| color                      | CSS color formats       | text color                                         | `#333333`                              |
| css-class                  | string                  | class name, added to the root HTML element created |                                        |
| container-background-color | CSS color formats       | inner element background color                     |                                        |
| font-family                | string                  | font name                                          | `Ubuntu, Helvetica, Arial, sans-serif` |
| font-size                  | `px`                    | font size                                          | `13px`                                 |
| font-style                 | string                  | font style                                         | normal                                 |
| font-weight                | string                  | font weight                                        | normal                                 |
| icon-height                | `px` `%`                | icon height, overrides `icon-size`                 | icon-size                              |
| icon-padding               | `px` `%`                | padding around the icons                           |                                        |
| icon-size                  | `px` `%`                | icon size (width and height)                       | `20px`                                 |
| inner-padding              | `px` `%`                | social network surrounding padding                 | `null`                                 |
| line-height                | `px` `%`                | space between lines                                | `22px`                                 |
| mode                       | `horizontal` `vertical` | direction of social elements                       | `horizontal`                           |
| padding                    | `px` `%`                | social padding, supports up to 4 parameters        | `10px 25px`                            |
| padding-bottom             | `px` `%`                | bottom padding                                     |                                        |
| padding-left               | `px` `%`                | left padding                                       |                                        |
| padding-right              | `px` `%`                | right padding                                      |                                        |
| padding-top                | `px` `%`                | top padding                                        |                                        |
| text-padding               | `px` `%`                | padding around the text                            |                                        |
| text-decoration            | string                  | CSS values, e.g. `underline` `overline` `none`     | `none`                                 |

<p class="cta-container"><a class="cta" href="https://mjml.io/try-it-live/components/social">Try it live</a></p>

#### mj-social-element

This component enables you to display a given social network inside `mj-social`.
Note that default icons are transparent, which allows `background-color` to actually be the icon color.

<div class="alert alert-note" role="alert">
  <p>Note</p>
  <p><code>mj-social-element</code> is an "ending tag", which means that it can contain HTML code but it cannot contain other MJML components.</p> 
  <p>More information about ending tags <a href="#ending-tags">in this section</a>.</p>
</div>


#### Attributes

| attribute        | accepts                 | description                                                                     | default value                          |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| align            | `left` `center` `right` | align content                                                                   | `center`                               |
| alt              | string                  | image alt attribute                                                             | `''`                                   |
| background-color | CSS color formats       | icon color                                                                      | Each social `name` has its own default |
| border-radius    | `px`                    | border radius                                                                   | `3px`                                  |
| color            | CSS color formats       | text color                                                                      | `#000`                                 |
| css-class        | string                  | class name, added to the root HTML element created                              |                                        |
| font-family      | string                  | font name                                                                       | `Ubuntu, Helvetica, Arial, sans-serif` |
| font-size        | `px`                    | font size                                                                       | `13px`                                 |
| font-style       | string                  | font style                                                                      |                                        |
| font-weight      | string                  | font weight                                                                     |                                        |
| href             | string                  | button redirection, in URL format                                               |                                        |
| icon-height      | percent/px              | icon height, overrides icon-size                                                | `icon-size`                            |
| icon-padding     | `px` `%`                | padding around the icon                                                         |                                        |
| icon-position    | `left` `right`          | sets the side of the icon                                                       |                                        |
| icon-size        | `px` `%`                | icon size (width and height)                                                    |                                        |
| line-height      | `px` `%`                | space between lines                                                             | `1`                                    |
| name             | string                  | social network name, see supported list below                                   |                                        |
| padding          | `px` `%`                | social element padding, supports up to 4 parameters                             | `4px`                                  |
| padding-bottom   | `px` `%`                | bottom padding                                                                  |                                        |
| padding-left     | `px` `%`                | left padding                                                                    |                                        |
| padding-right    | `px` `%`                | right padding                                                                   |                                        |
| padding-top      | `px` `%`                | top padding                                                                     |                                        |
| rel              | string                  | specify the rel attribute for the link                                          |                                        |
| sizes            | string                  | set icon width based on query                                                   |                                        |
| src              | string                  | image source, in URL format                                                     | Each social `name` has its own default |
| srcset           | string                  | enables to set a different image source based on the viewport, using CSS syntax |                                        |
| target           | string                  | link target                                                                     | `_blank`                               |
| text-decoration  | string                  | CSS values, e.g. `underline` `overline` `none`                                  | `none`                                 |
| text-padding     | `px` `%`                | padding around the text                                                         | `4px 4px 4px 0`                        |
| title            | string                  | image title attribute                                                           |                                        |
| vertical-align   | `top` `middle` `bottom` | vertically align elements                                                       | `middle`                               |

Supported networks with a share url:

- `facebook`
- `twitter`
- `x`
- `google`
- `pinterest`
- `linkedin`
- `tumblr`
- `xing`

Without a share url:

- `github`
- `instagram`
- `web`
- `snapchat`
- `youtube`
- `vimeo`
- `medium`
- `soundcloud`
- `dribbble`

When using a network with share url, the `href` attribute will be inserted in the share url (i.e. `https://www.facebook.com/sharer/sharer.php?u=[[URL]]`). To keep your `href` unchanged, add `-noshare` to the network name. Example :

`<mj-social-element name="twitter-noshare" href="my-unchanged-url">Twitter</mj-social-element>`

#### Custom Social Element

You can add any unsupported network like this:

```xml
<mj-social-element href="url" background-color="#FF00FF" src="path-to-your-icon">
  Optional label
</mj-social-element>
```

You can also use mj-social this way with no `href` attribute to make a simple list of inlined images-texts.
