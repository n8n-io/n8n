
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_nodereplacechildnewchilddiffdocument";
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
    The "replaceChild(newChild,oldChild)" method raises a 
    WRONG_DOCUMENT_ERR DOMException if the "newChild" was
    created from a different document than the one that 
    created this node.
    
    Retrieve the second employee and attempt to replace one   
    of its children with a node created from a different 
    document.   An attempt to make such a replacement 
    should raise the desired exception.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#xpointer(id('ID-258A00AF')/constant[@name='NOT_FOUND_ERR'])
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-785887307
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#xpointer(id('ID-785887307')/raises/exception[@name='DOMException']/descr/p[substring-before(.,':')='NOT_FOUND_ERR'])
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-785887307
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=247
*/
function hc_nodereplacechildnewchilddiffdocument() {
   var success;
    if(checkInitialization(builder, "hc_nodereplacechildnewchilddiffdocument") != null) return;
    var doc1;
      var doc2;
      var oldChild;
      var newChild;
      var elementList;
      var elementNode;
      var replacedChild;
      
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
      newChild = doc1.createElement("br");
      elementList = doc2.getElementsByTagName("p");
      elementNode = elementList.item(1);
      oldChild = elementNode.firstChild;

      
	{
		success = false;
		try {
            replacedChild = elementNode.replaceChild(newChild,oldChild);
        }
		catch(ex) {
      success = (typeof(ex.code) != 'undefined' && ex.code == 4);
		}
		assertTrue("throw_WRONG_DOCUMENT_ERR",success);
	}

}




function runTest() {
   return; // CSA: disabled; latest DOM spec adopts rather than throws.
   hc_nodereplacechildnewchilddiffdocument();
}
