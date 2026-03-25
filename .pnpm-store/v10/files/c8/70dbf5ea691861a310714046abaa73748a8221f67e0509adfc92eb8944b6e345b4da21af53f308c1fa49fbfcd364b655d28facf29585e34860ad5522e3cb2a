## mj-social

<p style="text-align: center;" >
  <img src="https://cloud.githubusercontent.com/assets/6558790/12751360/0c78ce48-c9bd-11e5-98ca-4a2ac9e6341b.png" alt="desktop" style="width: 250px;"/>
</p>

<aside class="warning">
  `mj-social-element`'s `name` attribute is a shortcut for some common social elements. <br />
  You should avoid rely too much on this as those icons are hosted by Mailjet for their Email Builder.<br />
  Use <a href="#custom-social-element">custom element syntax instead.</a>
</aside>

Displays calls-to-action for various social networks with their associated logo. You can add social networks with the `mj-social-element` tag.

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

<p style="text-align: center;" >
  <a href="https://mjml.io/try-it-live/components/social">
    <img width="100px" src="https://mjml.io/assets/img/svg/TRYITLIVE.svg" alt="try it live" />
  </a>
</p>

<aside class="notice">
  `mj-social-element` is an "ending tag", which means it can contain HTML code which will be left as it is, so it can contain HTML tags with attributes, but it cannot contain other MJML components. More information about ending tags <a href="#ending-tags">in this section</a>.
</aside>


attribute                   | unit        | description                   | default value
----------------------------|-------------|-------------------------------|---------------------------
align                       | string      | left/right/center             | center
border-radius               | px          | border radius                 | 3px
color                       | color       | text color                    | #333333
css-class                   | string      | class name, added to the root HTML element created | n/a
container-background-color  | color       | inner element background color                     | n/a
font-family                 | string      | font name                     | Ubuntu, Helvetica, Arial, sans-serif
font-size                   | px/em       | font size                     | 13px
font-style                  | string      | font style                    | normal
font-weight                 | string      | font weight                   | normal
icon-height                 | percent/px  | icon height, overrides icon-size | icon-size
icon-size                   | percent/px  | icon size (width and height)  | 20px
inner-padding               | px          | social network surrounding padding                 | 4px
line-height                 | percent/px  | space between lines           | 22px
mode                        | string      | vertical/horizontal           | horizontal
padding                     | px          | supports up to 4 parameters                       | 10px 25px
padding-bottom              | px          | bottom offset                    | n/a
padding-left                | px          | left offset                      | n/a
padding-right               | px          | right offset                       | n/a
padding-top                 | px          | top offset                         | n/a
icon-padding                | px          | padding around the icons      | 0px
text-padding                | px          | padding around the texts      | 4px 4px 4px 0
text-decoration             | string      | underline/overline/none       | none

### mj-social-element

This component enables you to display a given social network inside `mj-social`.
Note that default icons are transparent, which allows `background-color` to actually be the icon color.


attribute                   | unit        | description                   | default value
----------------------------|-------------|-------------------------------|---------------------------
align                       | string      | left/right/center             | center
alt                         | string      | image alt attribute           | ''
background-color            | color       | icon color                    | Each social `name` has its own default
border-radius               | px          | border radius                 | 3px
color                       | color       | text color                    | #333333
css-class                   | string      | class name, added to the root HTML element created | n/a
font-family                 | string      | font name                     | Ubuntu, Helvetica, Arial, sans-serif
font-size                   | px/em       | font size                     | 13px
font-style                  | string      | font style                    | normal
font-weight                 | string      | font weight                   | normal
href                        | url         | button redirection url        | none
icon-height                 | percent/px  | icon height, overrides icon-size | icon-size
icon-size                   | percent/px  | icon size (width and height)  | 20px
line-height                 | percent/px  | space between lines           | 22px
name                        | string      | social network name, see supported list below | N/A
padding                     | px          | supports up to 4 parameters                       | 4px
padding-bottom              | px          | bottom offset                    | n/a
padding-left                | px          | left offset                      | n/a
padding-right               | px          | right offset                       | n/a
padding-top                 | px          | top offset                         | n/a
icon-padding                | px          | padding around the icon       | 0px
text-padding                | px          | padding around the text       | 4px 4px 4px 0
sizes                       | media query & width | set icon width based on query | n/a
src                         | url         | image source                  | Each social `name` has its own default
srcset                      | url & width | set a different image source based on the viewport | n/a
rel                         | string      | specify the rel attribute for the link    | n/a
target                      | string      | link target                   | \_blank
title                       | string      | img title attribute           | none
text-decoration             | string      | underline/overline/none       | none
vertical-align              | string      | top/middle/bottom             | middle

Supported networks with a share url:
- facebook
- twitter
- x
- google
- pinterest
- linkedin
- tumblr
- xing

Without a share url:
- github
- instagram
- web
- snapchat
- youtube
- vimeo
- medium
- soundcloud
- dribbble

When using a network with share url, the `href` attribute will be inserted in the share url (i.e. `https://www.facebook.com/sharer/sharer.php?u=[[URL]]`). To keep your `href` unchanged, add `-noshare` to the network name. Example :

`
<mj-social-element name="twitter-noshare" href="my-unchanged-url">Twitter</mj-social-element>
`

### Custom Social Element

You can add any unsupported network like this:

```xml
<mj-social-element href="url" background-color="#FF00FF" src="path-to-your-icon">
  Optional label
</mj-social-element>
```

You can also use mj-social this way with no `href` attribute to make a simple list of inlined images-texts.
