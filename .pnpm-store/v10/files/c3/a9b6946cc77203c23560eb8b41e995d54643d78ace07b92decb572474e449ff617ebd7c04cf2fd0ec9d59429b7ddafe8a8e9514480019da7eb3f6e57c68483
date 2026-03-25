/* global anchors */

// add anchor links to headers
anchors.options.placement = 'left';
anchors.add('h3');

// Filter UI
var tocElements = document.getElementById('toc')
  .getElementsByTagName('li');

document.getElementById('filter-input')
  .addEventListener('keyup', function (e) {

    var i, element, children;

    // enter key
    if (e.keyCode === 13) {
      // go to the first displayed item in the toc
      for (i = 0; i < tocElements.length; i++) {
        element = tocElements[i];
        if (!element.classList.contains('display-none')) {
          location.replace(element.firstChild.href);
          return e.preventDefault();
        }
      }
    }

    var match = function () {
      return true;
    };

    var value = this.value.toLowerCase();

    if (!value.match(/^\s*$/)) {
      match = function (element) {
        return element.firstChild.innerHTML.toLowerCase().indexOf(value) !== -1;
      };
    }

    for (i = 0; i < tocElements.length; i++) {
      element = tocElements[i];
      children = Array.from(element.getElementsByTagName('li'));
      if (match(element) || children.some(match)) {
        element.classList.remove('display-none');
      } else {
        element.classList.add('display-none');
      }
    }
  });

var toggles = document.getElementsByClassName('toggle-step-sibling');
for (var i = 0; i < toggles.length; i++) {
  toggles[i].addEventListener('click', toggleStepSibling);
}

function toggleStepSibling() {
  var stepSibling = this.parentNode.parentNode.parentNode.getElementsByClassName('toggle-target')[0];
  var klass = 'display-none';
  if (stepSibling.classList.contains(klass)) {
    stepSibling.classList.remove(klass);
    stepSibling.innerHTML = '▾';
  } else {
    stepSibling.classList.add(klass);
    stepSibling.innerHTML = '▸';
  }
}

var items = document.getElementsByClassName('toggle-sibling');
for (var j = 0; j < items.length; j++) {
  items[j].addEventListener('click', toggleSibling);
}

function toggleSibling() {
  var stepSibling = this.parentNode.getElementsByClassName('toggle-target')[0];
  var icon = this.getElementsByClassName('icon')[0];
  var klass = 'display-none';
  if (stepSibling.classList.contains(klass)) {
    stepSibling.classList.remove(klass);
    icon.innerHTML = '▾';
  } else {
    stepSibling.classList.add(klass);
    icon.innerHTML = '▸';
  }
}

function showHashTarget(targetId) {
  var hashTarget = document.getElementById(targetId);
  // new target is hidden
  if (hashTarget && hashTarget.offsetHeight === 0 &&
    hashTarget.parentNode.parentNode.classList.contains('display-none')) {
    hashTarget.parentNode.parentNode.classList.remove('display-none');
  }
}

window.addEventListener('hashchange', function() {
  showHashTarget(location.hash.substring(1));
});

showHashTarget(location.hash.substring(1));

var toclinks = document.getElementsByClassName('pre-open');
for (var k = 0; k < toclinks.length; k++) {
  toclinks[k].addEventListener('mousedown', preOpen, false);
}

function preOpen() {
  showHashTarget(this.hash.substring(1));
}
