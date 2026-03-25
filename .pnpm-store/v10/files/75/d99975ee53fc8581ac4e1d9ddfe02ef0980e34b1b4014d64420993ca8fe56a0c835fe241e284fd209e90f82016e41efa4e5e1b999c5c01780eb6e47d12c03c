
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_documentgetelementsbytagnametotallength";
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
   Retrieve the entire DOM document and invoke its 
   "getElementsByTagName(tagName)" method with tagName
   equal to "*".  The method should return a NodeList 
   that contains all the elements of the document. 

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-A6C9094
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=251
*/
function hc_documentgetelementsbytagnametotallength() {
   var success;
    if(checkInitialization(builder, "hc_documentgetelementsbytagnametotallength") != null) return;
    var doc;
      var nameList;
      expectedNames = new Array();
      expectedNames[0] = "html";
      expectedNames[1] = "head";
      expectedNames[2] = "meta";
      expectedNames[3] = "title";
      expectedNames[4] = "script";
      expectedNames[5] = "script";
      expectedNames[6] = "script";
      expectedNames[7] = "body";
      expectedNames[8] = "p";
      expectedNames[9] = "em";
      expectedNames[10] = "strong";
      expectedNames[11] = "code";
      expectedNames[12] = "sup";
      expectedNames[13] = "var";
      expectedNames[14] = "acronym";
      expectedNames[15] = "p";
      expectedNames[16] = "em";
      expectedNames[17] = "strong";
      expectedNames[18] = "code";
      expectedNames[19] = "sup";
      expectedNames[20] = "var";
      expectedNames[21] = "acronym";
      expectedNames[22] = "p";
      expectedNames[23] = "em";
      expectedNames[24] = "strong";
      expectedNames[25] = "code";
      expectedNames[26] = "sup";
      expectedNames[27] = "var";
      expectedNames[28] = "acronym";
      expectedNames[29] = "p";
      expectedNames[30] = "em";
      expectedNames[31] = "strong";
      expectedNames[32] = "code";
      expectedNames[33] = "sup";
      expectedNames[34] = "var";
      expectedNames[35] = "acronym";
      expectedNames[36] = "p";
      expectedNames[37] = "em";
      expectedNames[38] = "strong";
      expectedNames[39] = "code";
      expectedNames[40] = "sup";
      expectedNames[41] = "var";
      expectedNames[42] = "acronym";

      svgExpectedNames = new Array();
      svgExpectedNames[0] = "svg";
      svgExpectedNames[1] = "rect";
      svgExpectedNames[2] = "script";
      svgExpectedNames[3] = "head";
      svgExpectedNames[4] = "meta";
      svgExpectedNames[5] = "title";
      svgExpectedNames[6] = "body";
      svgExpectedNames[7] = "p";
      svgExpectedNames[8] = "em";
      svgExpectedNames[9] = "strong";
      svgExpectedNames[10] = "code";
      svgExpectedNames[11] = "sup";
      svgExpectedNames[12] = "var";
      svgExpectedNames[13] = "acronym";
      svgExpectedNames[14] = "p";
      svgExpectedNames[15] = "em";
      svgExpectedNames[16] = "strong";
      svgExpectedNames[17] = "code";
      svgExpectedNames[18] = "sup";
      svgExpectedNames[19] = "var";
      svgExpectedNames[20] = "acronym";
      svgExpectedNames[21] = "p";
      svgExpectedNames[22] = "em";
      svgExpectedNames[23] = "strong";
      svgExpectedNames[24] = "code";
      svgExpectedNames[25] = "sup";
      svgExpectedNames[26] = "var";
      svgExpectedNames[27] = "acronym";
      svgExpectedNames[28] = "p";
      svgExpectedNames[29] = "em";
      svgExpectedNames[30] = "strong";
      svgExpectedNames[31] = "code";
      svgExpectedNames[32] = "sup";
      svgExpectedNames[33] = "var";
      svgExpectedNames[34] = "acronym";
      svgExpectedNames[35] = "p";
      svgExpectedNames[36] = "em";
      svgExpectedNames[37] = "strong";
      svgExpectedNames[38] = "code";
      svgExpectedNames[39] = "sup";
      svgExpectedNames[40] = "var";
      svgExpectedNames[41] = "acronym";

      var actualNames = new Array();

      var thisElement;
      var thisTag;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      nameList = doc.getElementsByTagName("*");
      for(var indexN10148 = 0;indexN10148 < nameList.length; indexN10148++) {
      thisElement = nameList.item(indexN10148);
      thisTag = thisElement.tagName;

      actualNames[actualNames.length] = thisTag;

	}
   
	if(
	
	(builder.contentType == "image/svg+xml")

	) {
	assertEqualsListAutoCase("element", "svgTagNames",svgExpectedNames,actualNames);
       
	}
	
		else {
			assertEqualsListAutoCase("element", "tagNames",expectedNames,actualNames);
       
		}
	
}




function runTest() {
   hc_documentgetelementsbytagnametotallength();
}
