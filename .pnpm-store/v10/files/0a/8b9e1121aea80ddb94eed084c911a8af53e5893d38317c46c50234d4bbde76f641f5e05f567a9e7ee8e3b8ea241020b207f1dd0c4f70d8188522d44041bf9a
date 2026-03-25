
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_namednodemapremovenameditem";
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
    The "removeNamedItem(name)" method removes a node 
   specified by name. 
   
   Retrieve the third employee and create a NamedNodeMap 
   object of the attributes of the last child.  Once the
   list is created invoke the "removeNamedItem(name)"
   method with name="class".  This should result
   in the removal of the specified attribute.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-D58B193
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-349467F9
* @see http://lists.w3.org/Archives/Public/www-dom-ts/2002Mar/0002.html
*/
function hc_namednodemapremovenameditem() {
   var success;
    if(checkInitialization(builder, "hc_namednodemapremovenameditem") != null) return;
    var doc;
      var elementList;
      var newAttribute;
      var testAddress;
      var attributes;
      var streetAttr;
      var specified;
      var removedNode;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("acronym");
      testAddress = elementList.item(2);
      attributes = testAddress.attributes;

      removedNode = attributes.removeNamedItem("class");
      streetAttr = attributes.getNamedItem("class");
      assertNull("isnull",streetAttr);
    
}




function runTest() {
   hc_namednodemapremovenameditem();
}
