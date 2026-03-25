
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_namednodemapchildnoderange";
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
   Create a NamedNodeMap object from the attributes of the
   last child of the third "p" element and traverse the
   list from index 0 thru length -1.  All indices should
   be valid.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-84CF096
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-349467F9
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-6D0FB19E
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=250
*/
function hc_namednodemapchildnoderange() {
   var success;
    if(checkInitialization(builder, "hc_namednodemapchildnoderange") != null) return;
    var doc;
      var elementList;
      var testEmployee;
      var attributes;
      var child;
      var strong;
      var length;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("acronym");
      testEmployee = elementList.item(2);
      attributes = testEmployee.attributes;

      length = attributes.length;

      
	if(
	
	(builder.contentType == "text/html")

	) {
	assertEquals("htmlLength",2,length);
       
	}
	
		else {
			assertEquals("length",3,length);
       child = attributes.item(2);
      assertNotNull("attr2",child);

		}
	child = attributes.item(0);
      assertNotNull("attr0",child);
child = attributes.item(1);
      assertNotNull("attr1",child);
child = attributes.item(3);
      assertNull("attr3",child);
    
}




function runTest() {
   hc_namednodemapchildnoderange();
}
