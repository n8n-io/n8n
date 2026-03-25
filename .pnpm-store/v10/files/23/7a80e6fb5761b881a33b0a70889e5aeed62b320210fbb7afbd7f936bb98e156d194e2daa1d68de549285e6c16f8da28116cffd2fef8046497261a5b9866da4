
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_elementinuseattributeerr";
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
    The "setAttributeNode(newAttr)" method raises an 
   "INUSE_ATTRIBUTE_ERR DOMException if the "newAttr" 
   is already an attribute of another element.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#xpointer(id('ID-258A00AF')/constant[@name='INUSE_ATTRIBUTE_ERR'])
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-887236154
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#xpointer(id('ID-887236154')/raises/exception[@name='DOMException']/descr/p[substring-before(.,':')='INUSE_ATTRIBUTE_ERR'])
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=244
*/
function hc_elementinuseattributeerr() {
   var success;
    if(checkInitialization(builder, "hc_elementinuseattributeerr") != null) return;
    var doc;
      var newAttribute;
      var addressElementList;
      var testAddress;
      var newElement;
      var attrAddress;
      var appendedChild;
      var setAttr1;
      var setAttr2;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      addressElementList = doc.getElementsByTagName("body");
      testAddress = addressElementList.item(0);
      newElement = doc.createElement("p");
      appendedChild = testAddress.appendChild(newElement);
      newAttribute = doc.createAttribute("title");
      setAttr1 = newElement.setAttributeNode(newAttribute);
      
	{
		success = false;
		try {
            setAttr2 = testAddress.setAttributeNode(newAttribute);
        }
		catch(ex) {
      success = (typeof(ex.code) != 'undefined' && ex.code == 10);
		}
		assertTrue("throw_INUSE_ATTRIBUTE_ERR",success);
	}

}




function runTest() {
   hc_elementinuseattributeerr();
}
