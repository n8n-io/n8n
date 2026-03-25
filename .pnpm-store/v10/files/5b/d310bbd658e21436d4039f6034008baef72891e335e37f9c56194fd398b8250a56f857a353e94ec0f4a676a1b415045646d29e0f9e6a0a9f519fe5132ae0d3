import type { CheerioAPI } from '../load.js';
import { load } from '../load-parse.js';

/** A Cheerio instance with no content. */
export const cheerio: CheerioAPI = load([]);

export const fruits: string = [
  '<ul id="fruits">',
  '<li class="apple">Apple</li>',
  '<li class="orange">Orange</li>',
  '<li class="pear">Pear</li>',
  '</ul>',
].join('');

export const vegetables: string = [
  '<ul id="vegetables">',
  '<li class="carrot">Carrot</li>',
  '<li class="sweetcorn">Sweetcorn</li>',
  '</ul>',
].join('');

export const divcontainers: string = [
  '<div class="container">',
  '<div class="inner">First</div>',
  '<div class="inner">Second</div>',
  '</div>',
  '<div class="container">',
  '<div class="inner">Third</div>',
  '<div class="inner">Fourth</div>',
  '</div>',
  '<div id="new"><div>',
  '<div>\n\n<p><em><b></b></em></p>\n\n</div>',
  '</div>',
].join('');

export const chocolates: string = [
  '<ul id="chocolates">',
  '<li class="linth" data-highlight="Lindor" data-origin="swiss">Linth</li>',
  '<li class="frey" data-taste="sweet" data-best-collection="Mahony">Frey</li>',
  '<li class="cailler">Cailler</li>',
  '</ul>',
].join('');

export const drinks: string = [
  '<ul id="drinks">',
  '<li class="beer">Beer</li>',
  '<li class="juice">Juice</li>',
  '<li class="milk">Milk</li>',
  '<li class="water">Water</li>',
  '<li class="cider">Cider</li>',
  '</ul>',
].join('');

export const food: string = [
  '<ul id="food">',
  fruits,
  vegetables,
  '</ul>',
].join('');

export const eleven = `
<html>
  <body>
    <ul>
      <li>One</li>
      <li>Two</li>
      <li class="blue sel">Three</li>
      <li class="red">Four</li>
    </ul>

    <ul>
      <li class="red">Five</li>
      <li>Six</li>
      <li class="blue">Seven</li>
    </ul>

    <ul>
      <li>Eight</li>
      <li class="red sel">Nine</li>
      <li>Ten</li>
      <li class="sel">Eleven</li>
    </ul>
  </body>
</html>
`;

export const unwrapspans: string = [
  '<div id=unwrap style="display: none;">',
  '<div id=unwrap1><span class=unwrap>a</span><span class=unwrap>b</span></div>',
  '<div id=unwrap2><span class=unwrap>c</span><span class=unwrap>d</span></div>',
  '<div id=unwrap3><b><span class="unwrap unwrap3">e</span></b><b><span class="unwrap unwrap3">f</span></b></div>',
  '</div>',
].join('');

export const inputs: string = [
  '<select id="one"><option value="option_not_selected">Option not selected</option><option value="option_selected" selected>Option selected</option></select>',
  '<select id="one-valueless"><option>Option not selected</option><option selected>Option selected</option></select>',
  '<select id="one-html-entity"><option>Option not selected</option><option selected>Option &lt;selected&gt;</option></select>',
  '<select id="one-nested"><option>Option not selected</option><option selected>Option <span>selected</span></option></select>',
  '<input type="text" value="input_text" />',
  '<input type="checkbox" name="checkbox_off" value="off" /><input type="checkbox" name="checkbox_on" value="on" checked />',
  '<input type="checkbox" name="checkbox_valueless" />',
  '<input type="radio" value="off" name="radio" /><input type="radio" name="radio" value="on" checked />',
  '<input type="radio" value="off" name="radio[brackets]" /><input type="radio" name="radio[brackets]" value="on" checked />',
  '<input type="radio" name="radio_valueless" />',
  '<select id="multi" multiple><option value="1">1</option><option value="2" selected>2</option><option value="3" selected>3</option><option value="4">4</option></select>',
  '<select id="multi-valueless" multiple><option>1</option><option selected>2</option><option selected>3</option><option>4</option></select>',
].join('');

export const text: string = [
  '<p>Apples, <b>oranges</b> and pears.</p>',
  '<p>Carrots and <!-- sweetcorn --></p>',
].join('');

export const forms: string = [
  '<form id="simple"><input type="text" name="fruit" value="Apple" /></form>',
  '<form id="nested"><div><input type="text" name="fruit" value="Apple" /></div><input type="text" name="vegetable" value="Carrot" /></form>',
  '<form id="disabled"><input type="text" name="fruit" value="Apple" disabled /></form>',
  '<form id="submit"><input type="text" name="fruit" value="Apple" /><input type="submit" name="submit" value="Submit" /></form>',
  '<form id="select"><select name="fruit"><option value="Apple">Apple</option><option value="Orange" selected>Orange</option></select></form>',
  '<form id="unnamed"><input type="text" name="fruit" value="Apple" /><input type="text" value="Carrot" /></form>',
  '<form id="multiple"><select name="fruit" multiple><option value="Apple" selected>Apple</option><option value="Orange" selected>Orange</option><option value="Carrot">Carrot</option></select></form>',
  '<form id="textarea"><textarea name="fruits">Apple\nOrange</textarea></form>',
  '<form id="spaces"><input type="text" name="fruit" value="Blood orange" /></form>',
].join('');

export const noscript: string = [
  '</body>',
  '<noscript>',
  '<!-- anchor linking to external file -->',
  '<a href="https://github.com/cheeriojs/cheerio">External Link</a>',
  '</noscript>',
  '<p>Rocks!</p>',
  '</body>',
].join('');

export const script: string = [
  '<div>',
  '<a>A</a>',
  '<script>',
  '  var foo = "bar";',
  '</script>',
  '<b>B</b>',
  '</div>',
].join('');

export const mixedText = '<a>1</a>TEXT<b>2</b>';
