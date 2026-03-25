
/*
Copyright Â© 2001-2004 World Wide Web Consortium, 
(Massachusetts Institute of Technology, European Research Consortium 
for Informatics and Mathematics, Keio University). All 
Rights Reserved. This work is distributed under the W3CÂ® Software License [1] in the 
hope that it will be useful, but WITHOUT ANY WARRANTY; without even 
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 

[1] http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
*/



   /**
    *  Gets URI that identifies the test.
    *  @return uri identifier of test
    */
function getTargetURI() {
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_attrcreatedocumentfragment";
   }

var docsLoaded = -1000000;
var builder = null;

//
//   This function is called by the testing framework before
//      running the test suite.
//
//   If there are no configuration exceptions, asynchronous
//        document loading is started.  Otherwise, the status
//        is set to complete and the exception is immediately
//        raised when entering the body of the test.
//
function setUpPage() {
   setUpPageStatus = 'running';
   try {
     //
     //   creates test document builder, may throw exception
     //
     builder = createConfiguredBuilder();

      docsLoaded = 0;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      docsLoaded += preload(docRef, "doc", "hc_staff");
        
       if (docsLoaded == 1) {
          setUpPageStatus = 'complete';
       }
    } catch(ex) {
    	catchInitializationError(builder, ex);
        setUpPageStatus = 'complete';
    }
}



//
//   This method is called on the completion of 
//      each asychronous load started in setUpTests.
//
//   When every synchronous loaded document has completed,
//      the page status is changed which allows the
//      body of the test to be executed.
function loadComplete() {
    if (++docsLoaded == 1) {
        setUpPageStatus = 'complete';
    }
}


/**
* 
  Create a new DocumentFragment and add a newly created Element node(with one attribute).  
  Once the element is added, its attribute should be available as an attribute associated 
  with an Element within a DocumentFragment.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-35CB04B5
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-F68F082
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-B63ED1A3
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=236
* @see http://lists.w3.org/Archives/Public/www-dom-ts/2003Jun/0011.html
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=184
*/
function hc_attrcreatedocumentfragment() {
   var success;
    if(checkInitialization(builder, "hc_attrcreatedocumentfragment") != null) return;
    var doc;
      var docFragment;
      var newOne;
      var domesticNode;
      var attributes;
      var attribute;
      var attrName;
      var appendedChild;
      var langAttrCount = 0;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      docFragment = doc.createDocumentFragment();
      newOne = doc.createElement("html");
      newOne.setAttribute("lang","EN");
      appendedChild = docFragment.appendChild(newOne);
      domesticNode = docFragment.firstChild;

      attributes = domesticNode.attributes;

      for(var indexN10078 = 0;indexN10078 < attributes.length; indexN10078++) {
      attribute = attributes.item(indexN10078);
      attrName = attribute.nodeName;

      
	if(
	equalsAutoCase("attribute", "lang", attrName)
	) {
	langAttrCount += 1;

	}
	
	}
   assertEquals("hasLangAttr",1,langAttrCount);
       
}




function runTest() {
   hc_attrcreatedocumentfragment();
}
