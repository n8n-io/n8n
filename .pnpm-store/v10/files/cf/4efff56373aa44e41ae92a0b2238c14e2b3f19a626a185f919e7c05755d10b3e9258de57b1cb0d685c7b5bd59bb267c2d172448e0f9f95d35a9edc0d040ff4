
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_documentcreateelementcasesensitive";
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
    The tagName parameter in the "createElement(tagName)"
   method is case-sensitive for XML documents.
   Retrieve the entire DOM document and invoke its 
   "createElement(tagName)" method twice.  Once for tagName
   equal to "acronym" and once for tagName equal to "ACRONYM"
   Each call should create a distinct Element node.  The
   newly created Elements are then assigned attributes 
   that are retrieved.

   Modified on 27 June 2003 to avoid setting an invalid style
   values and checked the node names to see if they matched expectations.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-2141741547
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=243
*/
function hc_documentcreateelementcasesensitive() {
   var success;
    if(checkInitialization(builder, "hc_documentcreateelementcasesensitive") != null) return;
    var doc;
      var newElement1;
      var newElement2;
      var attribute1;
      var attribute2;
      var nodeName1;
      var nodeName2;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      newElement1 = doc.createElement("ACRONYM");
      newElement2 = doc.createElement("acronym");
      newElement1.setAttribute("lang","EN");
      newElement2.setAttribute("title","Dallas");
      attribute1 = newElement1.getAttribute("lang");
      attribute2 = newElement2.getAttribute("title");
      assertEquals("attrib1","EN",attribute1);
       assertEquals("attrib2","Dallas",attribute2);
       nodeName1 = newElement1.nodeName;

      nodeName2 = newElement2.nodeName;

      assertEqualsAutoCase("element", "nodeName1","ACRONYM",nodeName1);
       assertEqualsAutoCase("element", "nodeName2","acronym",nodeName2);
       
}




function runTest() {
   hc_documentcreateelementcasesensitive();
}
