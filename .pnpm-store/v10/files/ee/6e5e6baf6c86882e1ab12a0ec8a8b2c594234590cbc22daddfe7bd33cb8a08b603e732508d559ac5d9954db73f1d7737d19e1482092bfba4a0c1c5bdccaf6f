### mj-raw

Displays raw HTML that is not parsed by the MJML engine. Anything left inside this tag should be raw, responsive HTML. If placed inside the `mj-head` tag, its content will be added at the end of the HTML `<head>` tag.

```xml
<mjml>
  <mj-body>
    <mj-raw>
      <!-- Your content goes here -->
    </mj-raw>
  </mj-body>
</mjml>
```

You can tell the minifier to ignore some content by wrapping it between two `<!-- htmlmin:ignore -->` tags.

You can use `mj-raw` to add a templating language. Note that if you and use the `minify` option, you might get a `Parsing error`, especially when using the `<` character. These can be ignored by using the `<!-- htmlmin:ignore -->` tags.mlmin:ignore -->` tags.

```xml
<mjml>
  <mj-body>
    <mj-raw>
      <!-- htmlmin:ignore --> {% if foo < 5 %} <!-- htmlmin:ignore -->
    </mj-raw>
      <!-- Some mjml section -->
    <mj-raw>
      {% endif %}
    </mj-raw>
  </mj-body>
</mjml>
```

<div class="alert alert-note" role="alert">
  <p>Note</p>
  <p><code>mj-raw</code> is an "ending tag", which means that it can contain HTML code but it cannot contain other MJML components.</p> 
  <p>More information about ending tags <a href="#ending-tags">in this section</a>.</p>
</div>

You can also use `mj-raw` to add text at the beginning of the generated html, before the `<!doctype html>` line. For this you need to:

- add the `mj-raw` tag inside the `mjml` tag, outside of the `mj-head` and `mj-body` tags.
- add the `position="file-start"` attribute to the `mj-raw` tag:

Note that if you put multiple lines in this `mj-raw` and use the minify option, these lines will be joined into a single line by the minifier. These can be ignored by using the `<!-- htmlmin:ignore -->` tags.

```xml
<mjml>
  <mj-raw position="file-start">This will be added at the beginning of the file</mj-raw>
  <mj-body>
    <!-- Your content goes here -->
  </mj-body>
</mjml>
```

<p class="cta-container"><a class="cta" href="https://mjml.io/try-it-live/components/raw">Try it live</a></p>
