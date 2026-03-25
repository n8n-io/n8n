
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_elementwrongdocumenterr";
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
      
      var doc1Ref = null;
      if (typeof(this.doc1) != 'undefined') {
        doc1Ref = this.doc1;
      }
      docsLoaded += preload(doc1Ref, "doc1", "hc_staff");
        
      var doc2Ref = null;
      if (typeof(this.doc2) != 'undefined') {
        doc2Ref = this.doc2;
      }
      docsLoaded += preload(doc2Ref, "doc2", "hc_staff");
        
       if (docsLoaded == 2) {
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
    if (++docsLoaded == 2) {
        setUpPageStatus = 'complete';
    }
}


/**
* 
    The "setAttributeNode(newAttr)" method raises an 
   "WRONG_DOCUMENT_ERR DOMException if the "newAttr" 
   was created from a different document than the one that
   created this document.

   Retrieve the last employee and attempt to set a new
   attribute node for its "employee" element.  The new
   attribute was created from a document other than the
   one that created this element, therefore a
   WRONG_DOCUMENT_ERR DOMException should be raised.

   This test uses the "createAttribute(newAttr)" method
   from the Document interface.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#xpointer(id('ID-258A00AF')/constant[@name='WRONG_DOCUMENT_ERR'])
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-887236154
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#xpointer(id('ID-887236154')/raises/exception[@name='DOMException']/descr/p[substring-before(.,':')='WRONG_DOCUMENT_ERR'])
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=249
*/
function hc_elementwrongdocumenterr() {
   var success;
    if(checkInitialization(builder, "hc_elementwrongdocumenterr") != null) return;
    var doc1;
      var doc2;
      var newAttribute;
      var addressElementList;
      var testAddress;
      var attrAddress;
      
      var doc1Ref = null;
      if (typeof(this.doc1) != 'undefined') {
        doc1Ref = this.doc1;
      }
      doc1 = load(doc1Ref, "doc1", "hc_staff");
      
      var doc2Ref = null;
      if (typeof(this.doc2) != 'undefined') {
        doc2Ref = this.doc2;
      }
      doc2 = load(doc2Ref, "doc2", "hc_staff");
      newAttribute = doc2.createAttribute("newAttribute");
      addressElementList = doc1.getElementsByTagName("acronym");
      testAddress = addressElementList.item(4);
      
	{
		success = false;
		try {
            attrAddress = testAddress.setAttributeNode(newAttribute);
        }
		catch(ex) {
      success = (typeof(ex.code) != 'undefined' && ex.code == 4);
		}
		assertTrue("throw_WRONG_DOCUMENT_ERR",success);
	}

}




function runTest() {
   hc_elementwrongdocumenterr();
}
