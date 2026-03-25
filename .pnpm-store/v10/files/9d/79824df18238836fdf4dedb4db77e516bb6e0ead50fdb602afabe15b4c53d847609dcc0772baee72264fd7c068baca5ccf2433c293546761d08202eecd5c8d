(function () {

  /*
   * Support for live DOM updating import maps
   */
  new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.type === 'childList')
      for (var j = 0; j < mutation.addedNodes.length; j++) {
        var addedNode = mutation.addedNodes[j];
        if (addedNode.tagName === 'SCRIPT' && addedNode.type === 'systemjs-importmap' && !addedNode.sp) {
          System.prepareImport(true);
          break;
        }
      }
    }
  }).observe(document, { childList: true, subtree: true });

})();
