// # res/script.js
//
// This is the script file that gets copied into the output. It mainly manages the display
// of the folder tree. The idea of this script file is to be minimal and standalone. So
// that means no jQuery.

// Use localStorage to store data about the tree's state: whether or not
// the tree is visible and which directories are expanded. Unless the state
var sidebarVisible = (window.localStorage && window.localStorage.docker_showSidebar) ?
                        window.localStorage.docker_showSidebar == 'yes' :
                        defaultSidebar;

/**
 * ## makeTree
 *
 * Consructs the folder tree view
 *
 * @param {object} treeData Folder structure as in [queueFile](../src/docker.js.html#docker.prototype.queuefile)
 * @param {string} root Path from current file to root (ie `'../../'` etc.)
 * @param {string} filename The current file name
 */
function makeTree(treeData, root, filename) {
  var treeNode = document.getElementById('tree');
  var treeHandle = document.getElementById('sidebar-toggle');
  treeHandle.addEventListener('click', toggleTree, false);

  // Build the html and add it to the container.
  treeNode.innerHTML = nodeHtml('', treeData, '', root);

  // Root folder (whole tree) should always be open
  treeNode.childNodes[0].className += ' open';

  // Attach click event handler
  treeNode.addEventListener('click', nodeClicked, false);

  if (sidebarVisible) document.body.className += ' sidebar';

  // Restore scroll position from localStorage if set. And attach scroll handler
  if (window.localStorage && window.localStorage.docker_treeScroll) treeNode.scrollTop = window.localStorage.docker_treeScroll;
  treeNode.onscroll = treeScrolled;

  // Only set a class to allow CSS transitions after the tree state has been painted
  setTimeout(function() { document.body.className += ' slidey'; }, 100);
}

/**
 * ## treeScrolled
 *
 * Called when the tree is scrolled. Stores the scroll position in localStorage
 * so it can be restored on the next pageview.
 */
function treeScrolled() {
  var tree = document.getElementById('tree');
  if (window.localStorage) window.localStorage.docker_treeScroll = tree.scrollTop;
}

/**
 * ## nodeClicked
 *
 * Called when a directory is clicked. Toggles open state of the directory
 *
 * @param {Event} e The click event
 */
function nodeClicked(e) {
  // Find the target
  var t = e.target;

  // If the click target is actually a file (rather than a directory), ignore it
  if (t.tagName.toLowerCase() !== 'div' || t.className === 'children') return;

  // Recurse upwards until we find the actual directory node
  while (t && t.className.substring(0, 3) != 'dir') t = t.parentNode;

  // If we're at the root node, then do nothing (we don't allow collapsing of the whole tree)
  if (!t || t.parentNode.id == 'tree') return;

  // Find the path and toggle the state, saving the state in the localStorage variable
  var path = t.getAttribute('rel');
  if (t.className.indexOf('open') !== -1) {
    t.className = t.className.replace(/\s*open/g, '');
    if (window.localStorage) window.localStorage.removeItem('docker_openPath:' + path);
  } else {
    t.className += ' open';
    if (window.localStorage) window.localStorage['docker_openPath:' + path] = 'yes';
  }
}


/**
 * ## nodeHtml
 *
 * Constructs the markup for a directory in the tree
 *
 * @param {string} nodename The node name.
 * @param {object} node Node object of same format as whole tree.
 * @param {string} path The path form the base to this node
 * @param {string} root Relative path from current page to root
 */
function nodeHtml(nodename, node, path, root) {
  // Firstly, figure out whether or not the directory is expanded from localStorage
  var isOpen = window.localStorage && window.localStorage['docker_openPath:' + path] == 'yes';
  var out = '<div class="dir' + (isOpen ? ' open' : '') + '" rel="' + path + '">';
  out += '<div class="nodename">' + nodename + '</div>';
  out += '<div class="children">';

  // Loop through all child directories first
  if (node.dirs) {
    var dirs = [];
    for (var i in node.dirs) {
      if (node.dirs.hasOwnProperty(i)) dirs.push({ name: i, html: nodeHtml(i, node.dirs[i], path + i + '/', root) });
    }
    // Have to store them in an array first and then sort them alphabetically here
    dirs.sort(function(a, b) { return (a.name > b.name) ? 1 : (a.name == b.name) ? 0 : -1; });

    for (var k = 0; k < dirs.length; k += 1) out += dirs[k].html;
  }

  // Now loop through all the child files alphabetically
  if (node.files) {
    node.files.sort();
    for (var j = 0; j < node.files.length; j += 1) {
      out += '<a class="file" href="' + root + path + node.files[j] + '.html">' + node.files[j] + '</a>';
    }
  }

  // Close things off
  out += '</div></div>';

  return out;
}

/**
 * ## toggleTree
 *
 * Toggles the visibility of the folder tree
 */
function toggleTree() {
  // Do the actual toggling by modifying the class on the body element. That way we can get some nice CSS transitions going.
  if (sidebarVisible) {
    document.body.className = document.body.className.replace(/\s*sidebar/g, '');
    sidebarVisible = false;
  } else {
    document.body.className += ' sidebar';
    sidebarVisible = true;
  }
  if (window.localStorage) {
    if (sidebarVisible) {
      window.localStorage.docker_showSidebar = 'yes';
    } else {
      window.localStorage.docker_showSidebar = 'no';
    }
  }
}

/**
 * ## wireUpTabs
 *
 * Wires up events on the sidebar tabe
 */
function wireUpTabs() {
  var tabEl = document.getElementById('sidebar_switch');
  var children = tabEl.childNodes;

  // Each tab has a class corresponding of the id of its tab pane
  for (var i = 0, l = children.length; i < l; i += 1) {
    // Ignore text nodes
    if (children[i].nodeType !== 1) continue;
    children[i].addEventListener('click', function(c) {
      return function() { switchTab(c); };
    }(children[i].className));
  }
}

/**
 * ## switchTab
 *
 * Switches tabs in the sidebar
 *
 * @param {string} tab The ID of the tab to switch to
 */
function switchTab(tab) {
  var tabEl = document.getElementById('sidebar_switch');
  var children = tabEl.childNodes;

  // Easiest way to go through tabs without any kind of selector is just to look at the tab bar
  for (var i = 0, l = children.length; i < l; i += 1) {
    // Ignore text nodes
    if (children[i].nodeType !== 1) continue;

    // Figure out what tab pane this tab button corresponts to
    var t = children[i].className.replace(/\s.*$/, '');
    if (t === tab) {
      // Show the tab pane, select the tab button
      document.getElementById(t).style.display = 'block';
      if (children[i].className.indexOf('selected') === -1) children[i].className += ' selected';
    } else {
      // Hide the tab pane, deselect the tab button
      document.getElementById(t).style.display = 'none';
      children[i].className = children[i].className.replace(/\sselected/, '');
    }
  }

  // Store the last open tab in localStorage
  if (window.localStorage) window.localStorage.docker_sidebarTab = tab;
}

/**
 * ## window.onload
 *
 * When the document is ready, make the sidebar and all that jazz
 */
(function(init) {
  if (window.addEventListener) {
    window.addEventListener('DOMContentLoaded', init);
  } else { // IE8 and below
    window.onload = init;
  }
}(function() {
  makeTree(tree, relativeDir, thisFile);
  wireUpTabs();

  // Switch to the last viewed sidebar tab if stored, otherwise default to folder tree
  if (window.localStorage && window.localStorage.docker_sidebarTab) {
    switchTab(window.localStorage.docker_sidebarTab);
  } else {
    switchTab('tree');
  }
}));
